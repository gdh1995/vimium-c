var CheckBoxOption, NonEmptyTextOption, NumberOption, TextOption,
initOptionsPage;

Option.prototype.restoreToDefault = function() {
  bgSettings.set(this.field, bgSettings.defaults[this.field]);
  this.fetch();
  return this.previous;
};

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
      return this.restoreToDefault();
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
    MainPort.postMessage({
      handler: "initHelp",
      unbound: true,
      names: true,
      title: "Command Listing"
    }, MainPort.Listener);
  };

  saveOptions = function() {
    var btn = $("saveOptions");
    if (btn.disabled) {
      return;
    }
    Option.saveOptions();
    btn.disabled = true;
    btn.innerHTML = "No Changes";
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
      saveOptions();
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
