var CheckBoxOption, NonEmptyTextOption, NumberOption, TextOption,
initOptionsPage, importSettings, exportSetting;

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

NumberOption = (function(_super) {
  __extends(NumberOption, _super);

  function NumberOption() {
    NumberOption.__super__.constructor.apply(this, arguments);
    this.element.addEventListener("input", this.onUpdated);
  }

  NumberOption.prototype.populateElement = function(value) {
    return this.element.value = value;
  };

  NumberOption.prototype.readValueFromElement = function() {
    return parseFloat(this.element.value);
  };

  return NumberOption;

})(Option);

TextOption = (function(_super) {
  __extends(TextOption, _super);

  function TextOption() {
    TextOption.__super__.constructor.apply(this, arguments);
    this.element.addEventListener("input", this.onUpdated);
  }

  TextOption.prototype.populateElement = function(value) {
    return this.element.value = value.replace(/\n /g, '\n\xa0');
  };

  TextOption.prototype.readValueFromElement = function() {
    return this.element.value.trim().replace(/\xa0/g, ' ');
  };

  return TextOption;

})(Option);

NonEmptyTextOption = (function(_super) {
  __extends(NonEmptyTextOption, _super);

  function NonEmptyTextOption() {
    NonEmptyTextOption.__super__.constructor.apply(this, arguments);
  }

  NonEmptyTextOption.prototype.readValueFromElement = function() {
    var value = NonEmptyTextOption.__super__.readValueFromElement.call(this);
    if (value) {
      return value;
    } else {
      bgSettings.set(this.field, bgSettings.defaults[this.field]);
      this.fetch();
      return this.previous;
    }
  };

  return NonEmptyTextOption;

})(TextOption);

CheckBoxOption = (function(_super) {
  __extends(CheckBoxOption, _super);

  function CheckBoxOption() {
    CheckBoxOption.__super__.constructor.apply(this, arguments);
    this.element.addEventListener("change", this.onUpdated);
  }

  CheckBoxOption.prototype.populateElement = function(value) {
    return this.element.checked = value;
  };

  CheckBoxOption.prototype.readValueFromElement = function() {
    return this.element.checked;
  };

  return CheckBoxOption;

})(Option);


initOptionsPage = function() {
  var activateHelpDialog, element, maintainLinkHintsView, name, onUpdated //
    , options, saveOptions, toggleAdvancedOptions, type, _i, _ref, status = 0;

  onUpdated = function() {
    if (status == 1) { return; }
    status = 1;
    var saveBtn = $("saveOptions");
    saveBtn.removeAttribute("disabled");
    saveBtn.innerHTML = "Save Changes";
    $("exportButton").disabled = true;
  };

  maintainLinkHintsView = function() {
    var set = function(el, stat) {
      $(el).parentNode.parentNode.style.display = stat ? "" : "none";
    }, checked = $("filterLinkHints").checked;
    set("linkHintCharacters", !checked);
    set("linkHintNumbers", checked);
  };

  var advancedMode = !bgSettings.get("showAdvancedOptions");
  toggleAdvancedOptions = function(event) {
    if (advancedMode) {
      $("advancedOptions").style.display = "none";
      $("advancedOptionsButton").innerHTML = "Show Advanced Options";
    } else {
      $("advancedOptions").style.display = "";
      $("advancedOptionsButton").innerHTML = "Hide Advanced Options";
    }
    advancedMode = !advancedMode;
    bgSettings.set("showAdvancedOptions", advancedMode);
    $("advancedOptionsButton").blur();
  };

  activateHelpDialog = function(event) {
    var node;
    if (node = $("vimHelpDialog")) {
      node.click();
      DomUtils.suppressEvent(event);
      return;
    }
    MainPort.sendRequest({
      handler: "initHelp",
      unbound: true,
      names: true,
      title: "Command Listing"
    }, MainPort.Listener);
  };

  saveOptions = function() {
    var btn = $("saveOptions");
    if (!btn.disabled) {
      Option.saveOptions();
    }
    btn.disabled = true;
    btn.innerHTML = "No Changes";
    $("exportButton").disabled = false;
    status = 0;
    setTimeout(function () {
      window.onfocus();
      if (Option.syncToFrontend) {
        bgSettings.postUpdate("bufferToLoad", null);
        bgSettings.postUpdate("broadcast", {
          name: "settings",
          load: bgSettings.bufferToLoad
        });
        Option.syncToFrontend = false;
      }
    }, 100);
  };

  $("saveOptions").onclick = saveOptions;
  $("advancedOptionsButton").onclick = toggleAdvancedOptions;
  toggleAdvancedOptions({preventDefault: function() {}});
  $("showCommands").onclick = activateHelpDialog;
  $("filterLinkHints").onclick = maintainLinkHintsView;
  _ref = document.getElementsByClassName("nonEmptyTextOption");
  for (_i = _ref.length; 0 <= --_i; ) {
    element = _ref[_i];
    element.className = element.className + " example info";
    element.innerHTML = "Leave empty to reset this option.";
  }
  maintainLinkHintsView();
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
  $("exportButton").onclick = exportSetting;
  window.onbeforeunload = function() {
    if (status !== 0 && Option.needSaveOptions()) {
      return "You have unsaved changes to options.";
    }
  };
  document.addEventListener("keyup", function(event) {
    if (event.ctrlKey && event.keyCode === 13) {
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }
      if (status != 0) {
        saveOptions();
      }
    }
  });

  options = {
    exclusionRules: ExclusionRulesOption,
    filterLinkHints: CheckBoxOption,
    hideHud: CheckBoxOption,
    keyMappings: TextOption,
    linkHintCharacters: NonEmptyTextOption,
    linkHintNumbers: NonEmptyTextOption,
    newTabUrl: NonEmptyTextOption,
    nextPatterns: NonEmptyTextOption,
    previousPatterns: NonEmptyTextOption,
    regexFindMode: CheckBoxOption,
    scrollStepSize: NumberOption,
    smoothScroll: CheckBoxOption,
    searchEngines: TextOption,
    searchUrl: NonEmptyTextOption,
    userDefinedCss: TextOption
  };
  for (name in options) {
    type = options[name];
    new type(name, onUpdated);
  }
};

exportSetting = function() {
  var exported_object, exported_data, file_name, force2, d, nodeA;
  exported_object = {name: "Vimium++", time: 0};
  (function() {
    var storage = localStorage, i, len, key;
    for (i = 0, len = storage.length; i < len; i++) {
      key = storage.key(i);
      if (key === "name" || key === "time") { continue; }
      exported_object[key] = storage.getItem(key);
    }
  })();
  delete exported_object.findModeRawQuery;
  d = new Date();
  exported_object.time = d.getTime();
  exported_data = JSON.stringify(exported_object, null, '\t');
  exported_object = null;
  force2 = function(i) { return ((i <= 9) ? '0'  : '') + i; }
  file_name = 'vimium++_' + d.getFullYear() + force2(d.getMonth() + 1) + force2(d.getDate())
    + '_' + force2(d.getHours()) + force2(d.getMinutes()) + force2(d.getSeconds()) + '.json';

  nodeA = document.createElement("a");
  nodeA.download = file_name;
  nodeA.href = "data:application/json;charset=UTF-8," + encodeURIComponent(exported_data);
  nodeA.click();
  console.log("EXPORT settings to", file_name, "at", d);
};

importSettings = function() {
  var new_data;
  try {
    new_data = JSON.parse(this.result);
  } catch (e) {}
  if (!new_data || new_data.name !== "Vimium++" || !(new_data.time > 10000)) {
    VHUD.showForDuration("No settings data found!", 2000);
    return;
  } else if (!confirm(
    "You are loading a settings copy exported at:\n        "
    + new Date(new_data.time - new Date().getTimezoneOffset() * 1000 * 60
      ).toJSON().substring(0, 16).replace('T', ' ')
    + "\n\nAre you sure you want to continue?"
  )) {
    VHUD.showForDuration("You cancelled importing.", 1000);
    return;
  }

  var storage = localStorage, i, key, new_value, func;
  func = function(val) {
    return typeof val !== "string" ? val : val.substring(0, 72);
  };
  delete new_data.findModeRawQuery;
  console.log("IMPORT settings at", new Date(new_data.time));
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
      new_value = bgSettings.defaults[key];
    }
    if (!item.areEqual(bgSettings.get(key), new_value)) {
      console.log("import", key, func(new_value));
      bgSettings.set(key, new_value);
    }
    item.fetch();
  });
  for (key in new_data) {
    new_value = new_data[key];
    if (new_value == null) {
      if (key in bgSettings.defaults) {
        new_value = bgSettings.defaults[key];
        if (bgSettings.get(key) !== new_value) {
          bgSettings.set(key, new_value);
          console.log("reset", key, func(new_value));
        }
      } else if (storage.getItem(key) != null) {
        new_value = storage.getItem(key);
        storage.removeItem(key);
        console.log("remove", key, "<=", func(new_value));
      }
    } else if (key in bgSettings.defaults) {
      if (bgSettings.get(key) !== new_value) {
        bgSettings.set(key, new_value);
        console.log("save", key, func(new_value));
      }
    }
  }
  var btn = $("saveOptions");
  btn.disabled = true;
  btn.click();
  VHUD.showForDuration("Import settings data: OK!", 1000);
};
