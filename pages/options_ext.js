"use strict";

Option.saveOptions = function() {
  Option.all.forEach(function(option) {
    option.save();
  });
};

Option.needSaveOptions = function() {
  return !Option.all.every(function(option) {
    return option.areEqual(option.readValueFromElement(), option.previous);
  });
};

function NumberOption() {
  NumberOption.__super__.constructor.apply(this, arguments);
  this.element.addEventListener("input", this.onUpdated);
}
__extends(NumberOption, Option);

NumberOption.prototype.populateElement = function(value) {
  return this.element.value = value;
};

NumberOption.prototype.readValueFromElement = function() {
  return parseFloat(this.element.value);
};

function TextOption() {
  TextOption.__super__.constructor.apply(this, arguments);
  this.element.addEventListener("input", this.onUpdated);
}
__extends(TextOption, Option);

TextOption.prototype.populateElement = function(value) {
  return this.element.value = value.replace(/\n /g, '\n\xa0');
};

TextOption.prototype.readValueFromElement = function() {
  return this.element.value.trim().replace(/\xa0/g, ' ');
};

function NonEmptyTextOption(element) {
  NonEmptyTextOption.__super__.constructor.apply(this, arguments);
}
__extends(NonEmptyTextOption, TextOption);

NonEmptyTextOption.prototype.readValueFromElement = function() {
  var value = NonEmptyTextOption.__super__.readValueFromElement.call(this);
  if (!value) {
    value = bgSettings.defaults[this.field];
    this.populateElement(value);
  }
  return value;
};

function JSONOption() {
  JSONOption.__super__.constructor.apply(this, arguments);
}
__extends(JSONOption, TextOption);

JSONOption.prototype.populateElement = function(obj) {
  return JSONOption.__super__.populateElement.call(this, JSON.stringify(obj));
};

JSONOption.prototype.readValueFromElement = function() {
  var value = JSONOption.__super__.readValueFromElement.call(this), obj, std;
  obj = std = bgSettings.defaults[this.field];
  if (value) {
    try {
      obj = JSON.parse(value);
      if (JSON.stringify(obj) == JSON.stringify(std)) {
        obj = std;
      }
    } catch (e) {}
  } else {
    this.populateElement(obj);
  }
  return obj;
};

function CheckBoxOption() {
  CheckBoxOption.__super__.constructor.apply(this, arguments);
  this.element.addEventListener("change", this.onUpdated);
}
__extends(CheckBoxOption, Option);

CheckBoxOption.prototype.populateElement = function(value) {
  return this.element.checked = value;
};

CheckBoxOption.prototype.readValueFromElement = function() {
  return this.element.checked;
};

(function() {
  var advancedMode, element, name, onUpdated, saveOptions, type, _i, _ref, status = 0;

  onUpdated = function() {
    var saveBtn;
    if (this.areEqual(this.readValueFromElement(), this.previous)) {
      if (status == 1 && !Option.needSaveOptions()) {
        saveBtn = $("saveOptions");
        saveBtn.disabled = true;
        saveBtn.textContent = "No Changes";
        $("exportButton").disabled = false;
        status = 0;
      }
      return;
    } else if (status == 1) {
      return;
    }
    status = 1;
    saveBtn = $("saveOptions");
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Changes";
    $("exportButton").disabled = true;
  };

  $("showCommands").onclick = function(event) {
    var node;
    DomUtils.suppressEvent(event);
    if (node = document.querySelector('.HelpCommandName')) {
      node.click();
      return;
    }
    MainPort.sendMessage({
      handler: "initHelp",
      unbound: true,
      names: true,
      title: "Command Listing"
    }, function(response) {
      if (node = $("HelpDialog")) {
        MainPort.Listener({
          name: "execute",
          command: "showHelp",
          count: 1
        });
      }
      MainPort.Listener(response);
    });
  };

  saveOptions = function(virtually) {
    var btn = $("saveOptions"), toSync;
    if (virtually !== false) {
      Option.saveOptions();
    }
    toSync = Option.syncToFrontend;
    Option.syncToFrontend = [];
    btn.disabled = true;
    btn.textContent = "No Changes";
    $("exportButton").disabled = false;
    status = 0;
    setTimeout(function () {
      var event = new FocusEvent("focus"), i, key, ref;
      window.dispatchEvent(event);
      i = toSync.length;
      if (i === 0) { return; }
      bgSettings.postUpdate("bufferToLoad", null);
      var i, key, ref = bgSettings.bufferToLoad, obj = {name: "settingsUpdate"};
      while (0 <= --i) {
        key = toSync[i];
        obj[key] = ref[key];
      }
      bgSettings.postUpdate("broadcast", obj);
    }, 100);
  };
  $("saveOptions").onclick = saveOptions;

  _ref = document.getElementsByClassName("nonEmptyTextOption");
  for (_i = _ref.length; 0 <= --_i; ) {
    element = _ref[_i];
    element.className = element.className + " example info";
    element.textContent = "Leave empty to reset this option.";
  }

  window.onbeforeunload = function() {
    if (status !== 0 && Option.needSaveOptions()) {
      return "You have unsaved changes to options.";
    }
  };
  document.addEventListener("keyup", function(event) {
    if (event.ctrlKey && event.keyCode === 13) {
      var element = document.activeElement;
      if (element && element.blur) {
        element.blur();
      }
      if (status != 0) {
        saveOptions();
      }
    }
  });

  _ref = document.querySelectorAll("[data-model]");
  for (_i = _ref.length; 0 <= --_i; ) {
    element = _ref[_i];
    type = window[element.getAttribute("data-model") + "Option"];
    new type(element, onUpdated);
  }

  advancedMode = bgSettings.get("showAdvancedOptions");
  element = $("advancedOptionsButton");
  element.onclick = function(_0, init) {
    if (!init) {
      advancedMode = !advancedMode;
      bgSettings.set("showAdvancedOptions", advancedMode);
    }
    if (advancedMode) {
      $("advancedOptions").style.display = "";
      this.textContent = "Hide Advanced Options";
    } else {
      $("advancedOptions").style.display = "none";
      this.textContent = "Show Advanced Options";
    }
  };
  element.onclick(null, true);

  element = null;
})();

var formatDate = function(time) {
  return new Date(time - new Date().getTimezoneOffset() * 1000 * 60
    ).toJSON().substring(0, 19).replace('T', ' ');
};

$("exportButton").onclick = function() {
  var exported_object, exported_data, file_name, force2, d, nodeA;
  exported_object = {__proto__: null, name: "Vimium++", time: 0};
  (function() {
    var storage = localStorage, i, len, key, mark_head, all = bgSettings.defaults
      , strArr = bgSettings.NonJSON, arr1;
    mark_head = BG.Marks.getMarkKey("");
    for (i = 0, len = storage.length; i < len; i++) {
      key = storage.key(i);
      if (key === "name" || key === "time" || key.startsWith(mark_head)) {
        continue;
      }
      exported_object[key] = (key in strArr) && storage.getItem(key).indexOf("\n") > 0
        ? storage.getItem(key).split("\n")
        : (key in all) ? bgSettings.get(key) : storage.getItem(key);
    }
  })();
  delete exported_object.findModeRawQuery;
  delete exported_object.newTabUrl_f;
  d = new Date();
  exported_object.time = d.getTime();
  exported_data = JSON.stringify(exported_object, null, '\t');
  exported_object = null;
  force2 = function(i) { return ((i <= 9) ? '0'  : '') + i; }
  file_name = 'vimium++_' + d.getFullYear() + force2(d.getMonth() + 1) + force2(d.getDate())
    + '_' + force2(d.getHours()) + force2(d.getMinutes()) + force2(d.getSeconds()) + '.json';

  nodeA = document.createElement("a");
  nodeA.download = file_name;
  nodeA.href = URL.createObjectURL(new Blob([exported_data]));
  nodeA.click();
  URL.revokeObjectURL(nodeA.href);
  console.log("EXPORT settings to", file_name, "at", formatDate(d));
};

var importSettings = function() {
  var new_data;
  try {
    new_data = JSON.parse(this.result);
  } catch (e) {}
  if (!new_data || new_data.name !== "Vimium++" || !(new_data.time > 10000)) {
    VHUD.showForDuration("No settings data found!", 2000);
    return;
  } else if (!confirm(
    "You are loading a settings copy exported at:\n        "
    + formatDate(new_data.time)
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
  console.log("IMPORT settings at", new Date(new_data.time));
  delete new_data.name;
  delete new_data.time;
  delete new_data.findModeRawQuery;
  delete new_data.newTabUrl_f;
  Utils.setNullProto(new_data);
  for (i = storage.length; 0 <= --i; ) {
    key = storage.key(i);
    if (!(key in new_data)) {
      new_data[key] = null;
    }
  }
  Option.all.forEach(function(item) {
    var key = item.field, new_value = new_data[key];
    delete new_data[key];
    if (new_value == null) {
      new_value = all[key];
    } else if (new_value.join && (key in strArr)) {
      new_value = new_value.join("\n");
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
  bgSettings.postUpdate("newTabUrl");
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
      new_value = new_value.join("\n");
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
  var btn = $("saveOptions");
  btn.onclick(false);
  VHUD.showForDuration("Import settings data: OK!", 1000);
};

$("settingsFile").onchange = function() {
  var file = this.files[0], reader;
  this.value = "";
  if (!file) { return; }
  reader = new FileReader();
  reader.onload = importSettings;
  reader.readAsText(file);
};
$("importButton").onclick = function() {
  $("settingsFile").click();
};

(function() {
  var arr = document.querySelectorAll("[data-auto-scale]"), i, func;
  func = function() {
    var target = $(this.getAttribute("data-auto-scale"));
    if (target.scrollHeight <= target.clientHeight) { return; }
    target.style.overflow = "hidden";
    target.style.maxWidth = Math.max(window.innerWidth, 920) - 520 + "px";
    target.style.width  = target.scrollWidth  + 6 + "px";
    target.style.height = target.scrollHeight + 3 + "px";
    target.style.overflow = "";
  };
  for (i = arr.length; 0 <= --i; ) {
    arr[i].onclick = func;
  }
})();
