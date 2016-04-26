"use strict";

$("showCommands").onclick = function(event) {
  var node, root = DomUtils.UI.root;
  event && event.preventDefault();
  if (root && (node = root.querySelector('.HelpCommandName'))) {
    root.getElementById("HelpDialog").click();
    return;
  }
  MainPort.sendMessage({
    handler: "initHelp",
    unbound: true,
    names: true,
    title: "Command Listing"
  }, function(response) {
    var node, root = DomUtils.UI.root;
    if (root && (node = root.getElementById("HClose"))) {
      node.onclick();
    }
    MainPort.Listener(response);
    node = DomUtils.UI.root.getElementById("HelpDialog");
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
  });
};

var formatDate = function(time) {
  return new Date(time - new Date().getTimezoneOffset() * 1000 * 60
    ).toJSON().substring(0, 19).replace('T', ' ');
};

$("exportButton").onclick = function(event) {
  var exported_object, exported_data, file_name, force2, d, nodeA;
  exported_object = Object.create(null);
  exported_object.name = "Vimium++";
  exported_object.time = 0;
  (function() {
    var storage = localStorage, i, len, key, mark_head, all = bgSettings.defaults
      , strArr = bgSettings.NonJSON, arr1;
    mark_head = BG.Marks.getMarkKey("");
    for (i = 0, len = storage.length; i < len; i++) {
      key = storage.key(i);
      if (key === "name" || key === "time" || key.startsWith(mark_head)) {
        continue;
      }
      if ((key in strArr) && storage.getItem(key).indexOf("\n") > 0) {
        exported_object[key] = storage.getItem(key).split("\n");
        exported_object[key].push("");
      } else {
        exported_object[key] = (key in all) ? bgSettings.get(key) : storage.getItem(key);
      }
    }
  })();
  delete exported_object.findModeRawQuery;
  delete exported_object.newTabUrl_f;
  d = new Date();
  exported_object.time = d.getTime();
  exported_data = JSON.stringify(exported_object, null, '\t');
  exported_object = null;
  force2 = function(i) { return ((i <= 9) ? '0'  : '') + i; }
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

var importSettings = function(time, event) {
  var new_data, fileReader = event.target;
  try {
    new_data = JSON.parse(fileReader.result);
    time = new_data.time < 0 ? time : (new_data.time || 0);
  } catch (e) {}
  if (!new_data || new_data.name !== "Vimium++" || (time < 10000 && time > 0)) {
    VHUD.showForDuration("No settings data found!", 2000);
    return;
  } else if (!confirm(
    "You are loading a settings copy exported" + (time ? " at:\n        "
    + formatDate(time) : " before.")
    + "\n\nAre you sure you want to continue?"
  )) {
    VHUD.showForDuration("You cancelled importing.", 1000);
    return;
  }

  var storage = localStorage, i, key, new_value, func, all = bgSettings.defaults
    , strArr = bgSettings.NonJSON;
  func = function(val) {
    return typeof val !== "string" || val.length <= 72 ? val
      : val.substring(0, 68).trimRight() + " ...";
  };
  console.log("IMPORT settings at", formatDate(new Date(time)));
  delete new_data.name;
  delete new_data.time;
  Object.setPrototypeOf(new_data, null);
  for (i = storage.length; 0 <= --i; ) {
    key = storage.key(i);
    if (!(key in new_data)) {
      new_data[key] = null;
    }
  }
  delete new_data.findModeRawQuery;
  delete new_data.newTabUrl_f;
  Option.all.forEach(function(item) {
    var key = item.field, new_value = new_data[key];
    delete new_data[key];
    if (new_value == null) {
      // NOTE: we assume all nullable settings have the same default value: null
      new_value = all[key];
    } else if (new_value.join && (key in strArr)) {
      new_value = new_value.join("\n").trim();
    }
    if (!item.areEqual(bgSettings.get(key), new_value)) {
      console.log("import", key, func(new_value));
      bgSettings.set(key, new_value);
      if (key in bgSettings.bufferToLoad) {
        Option.syncToFrontend.push(key);
      }
    }
    item.fetch();
  });
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
    if (new_value.join && (key in strArr)) {
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
  VHUD.showForDuration("Import settings data: OK!", 1000);
};

$("settingsFile").onchange = function() {
  var file = this.files[0], reader;
  this.value = "";
  if (!file) { return; }
  reader = new FileReader();
  reader.onload = importSettings.bind(null, file.lastModified);
  reader.readAsText(file);
};
$("settingsFile").onclick = function() {};

if (window._delayed) {
  $(window._delayed).onclick();
  delete window._delayed;
}
