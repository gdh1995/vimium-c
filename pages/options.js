"use strict";
(function() {
  var $, CheckBoxOption, ExclusionRulesOption, NonEmptyTextOption, NumberOption, Option, TextOption,
    activateHelpDialog, bgSettings, bgExclusions, enableSaveButton, maintainLinkHintsView,
    ExclusionRulesOnPopupOption, initOptionsPage, initPopupPage, BG,
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) {
      for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
      function ctor() { this.constructor = child; } ctor.prototype = parent.prototype;
      child.prototype = new ctor(); child.__super__ = parent.prototype;
      return child;
    };

  $ = document.getElementById.bind(document);
  BG = chrome.extension.getBackgroundPage();
  bgSettings = BG.Settings;
  bgExclusions = BG.Exclusions;

  function Option(field, onUpdated) {
    this.field = field;
    this.element = $(this.field);
    this.onUpdated = onUpdated;
    this.fetch();
    Option.all.push(this);
  }

  Option.all = [];
  Option.syncToFrontend = false;

  Option.prototype.fetch = function() {
    this.populateElement(this.previous = bgSettings.get(this.field));
    return this.previous;
  };

  Option.prototype.save = function() {
    var value = this.readValueFromElement();
    if (!this.areEqual(value, this.previous)) {
      bgSettings.set(this.field, this.previous = value);
      if (this.field in bgSettings.bufferToLoad) {
        Option.syncToFrontend = true;
      }
    }
  };

  Option.prototype.areEqual = function(a, b) {
    return a === b;
  };

  Option.prototype.restoreToDefault = function() {
    bgSettings.set(this.field, bgSettings.defaults[this.field]);
    return this.fetch();
  };

  Option.saveOptions = function() {
    Option.all.forEach(function(option) {
      option.save();
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
      this.element.addEventListener("input", this.onUpdated);
    }

    NonEmptyTextOption.prototype.populateElement = function(value) {
      return this.element.value = value.replace(/\n /g, '\n\xa0');
    };

    NonEmptyTextOption.prototype.readValueFromElement = function() {
      var value = this.element.value.trim().replace(/\xa0/g, ' ');
      if (value) {
        return value;
      } else {
        return this.restoreToDefault();
      }
    };

    return NonEmptyTextOption;

  })(Option);

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

  ExclusionRulesOption = (function(_super) {
    __extends(ExclusionRulesOption, _super);

    function ExclusionRulesOption() {
      this.onRemoveRow = this.onRemoveRow.bind(this);
      ExclusionRulesOption.__super__.constructor.apply(this, arguments);
      $("exclusionAddButton").addEventListener("click", this.addRule.bind(this, null));
    }

    ExclusionRulesOption.prototype.addRule = function(pattern) {
      var element, exclusionScrollBox;
      if (pattern == null) {
        pattern = "";
      }
      element = this.appendRule({
        pattern: pattern,
        passKeys: ""
      });
      this.getPattern(element).focus();
      exclusionScrollBox = $("exclusionScrollBox");
      exclusionScrollBox.scrollTop = exclusionScrollBox.scrollHeight;
      this.onUpdated();
      return element;
    };

    ExclusionRulesOption.prototype.populateElement = function(rules) {
      rules.forEach(this.appendRule.bind(this));
    };

    ExclusionRulesOption.prototype.appendRule = function(rule) {
      var element, field, row, _i, _ref;
      row = document.importNode($('exclusionRuleTemplate').content, true);
      _ref = ["pattern", "passKeys"];
      for (_i = _ref.length; 0 <= --_i; ) {
        field = _ref[_i];
        element = row.querySelector('.' + field);
        element.value = rule[field];
        element.addEventListener("input", this.onUpdated);
      }
      this.getRemoveButton(row).addEventListener("click", this.onRemoveRow);
      this.element.appendChild(row);
      return this.element.children[this.element.children.length - 1];
    };
    
    ExclusionRulesOption.prototype.onRemoveRow = function(event) {
      var row1 = event.target.parentNode.parentNode;
      row1.parentNode.removeChild(row1);
      this.onUpdated();
    };

    ExclusionRulesOption.prototype.readValueFromElement = function(part) {
      var element, passKeys, pattern, rules, _i, _len, _ref, wchRegex;
      rules = [];
      wchRegex = /\s+/;
      _ref = this.element.getElementsByClassName("exclusionRuleInstance");
      part = (part === true);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        element = _ref[_i];
        if (part && element.style.display === "none") {
          continue;
        }
        pattern = this.getPattern(element).value.trim();
        if (!pattern) {
          continue;
        }
        passKeys = this.getPassKeys(element).value.replace(wchRegex, " ").trim();
        rules.push({
          pattern: pattern,
          passKeys: passKeys
        });
      }
      if (JSON.stringify(rules) === JSON.stringify(bgSettings.defaults[this.field])) {
        rules = bgSettings.defaults[this.field];
      }
      return rules;
    };

    ExclusionRulesOption.prototype.flatten = function(rule) {
      return (rule && rule.pattern) ? (rule.pattern + "\r" + rule.passKeys) : "";
    };

    ExclusionRulesOption.prototype.areEqual = function(a, b) {
      return a.map(this.flatten).join("\n") === b.map(this.flatten).join("\n");
    };

    ExclusionRulesOption.prototype.getPattern = function(element) {
      return element.querySelector(".pattern");
    };

    ExclusionRulesOption.prototype.getPassKeys = function(element) {
      return element.querySelector(".passKeys");
    };

    ExclusionRulesOption.prototype.getRemoveButton = function(element) {
      return element.querySelector(".exclusionRemoveButton");
    };

    return ExclusionRulesOption;

  })(Option);

  ExclusionRulesOnPopupOption = (function(_super) {
    __extends(ExclusionRulesOnPopupOption, _super);

    function ExclusionRulesOnPopupOption(url) {
      this.url = url;
      this.onInput = this.onInput.bind(this);
      ExclusionRulesOnPopupOption.__super__.constructor.apply(this,
        2 <= arguments.length ? Array.prototype.slice.call(arguments, 1) : []);
    }

    ExclusionRulesOnPopupOption.prototype.addRule = function() {
      var element = ExclusionRulesOnPopupOption.__super__.addRule.call(this,
        this.generateDefaultPattern());
      this.activatePatternWatcher(element);
      this.getPassKeys(element).focus();
      return element;
    };

    ExclusionRulesOnPopupOption.prototype.populateElement = function(rules) {
      var element, elements, haveMatch, pattern, _i, _j, _len, _len1;
      ExclusionRulesOnPopupOption.__super__.populateElement.call(this, rules);
      elements = this.element.getElementsByClassName("exclusionRuleInstance");
      for (_i = 0, _len = elements.length; _i < _len; _i++) {
        this.activatePatternWatcher(elements[_i]);
      }
      haveMatch = false;
      for (_j = 0, _len1 = elements.length; _j < _len1; _j++) {
        element = elements[_j];
        pattern = this.getPattern(element).value.trim();
        if (bgExclusions.re[pattern](this.url)) {
          haveMatch = true;
          this.getPassKeys(element).focus();
        } else {
          element.style.display = "none";
        }
      }
      if (!haveMatch) {
        this.addRule();
      }
    };

    ExclusionRulesOnPopupOption.prototype.activatePatternWatcher = function(element) {
      this.getPattern(element).addEventListener("input", this.onInput);
    };
    
    ExclusionRulesOnPopupOption.prototype.onInput = function(event) {
      var patternElement = event.target;
      if (bgExclusions.getRegex(patternElement.value)(this.url)) {
        patternElement.title = patternElement.style.color = "";
      } else {
        patternElement.style.color = "red";
        patternElement.title = "Red text means that the pattern does not\nmatch the current URL.";
      }
    }

    ExclusionRulesOnPopupOption.prototype.httpRegex = /^https?:\/\/./;
    ExclusionRulesOnPopupOption.prototype.urlRegex = /^[a-z]{3,}:\/\/./;
    ExclusionRulesOnPopupOption.prototype.generateDefaultPattern = function() {
      return this.httpRegex.test(this.url)
        ? ("https?://" + this.url.split("/", 3)[2] + "/")
        : this.urlRegex.test(this.url)
        ? (this.url.split("/", 3).join("/") + "/")
        : this.url;
    };

    return ExclusionRulesOnPopupOption;

  })(ExclusionRulesOption);

  initOptionsPage = function() {
    var activateHelpDialog, element, maintainLinkHintsView, name, onUpdated //
      , options, saveOptions, toggleAdvancedOptions, type, _i, _ref;

    onUpdated = function() {
      var saveBtn = $("saveOptions");
      saveBtn.removeAttribute("disabled");
      saveBtn.innerHTML = "Save Changes";
    };

    maintainLinkHintsView = function() {
      var hide, show;
      hide = function(el) {
        el.parentNode.parentNode.style.display = "none";
      };
      show = function(el) {
        el.parentNode.parentNode.style.display = "table-row";
      };
      if ($("filterLinkHints").checked) {
        hide($("linkHintCharacters"));
        show($("linkHintNumbers"));
      } else {
        show($("linkHintCharacters"));
        hide($("linkHintNumbers"));
      }
    };

    var advancedMode = !bgSettings.get("showAdvancedOptions");
    toggleAdvancedOptions = function(event) {
      if (advancedMode) {
        $("advancedOptions").style.display = "none";
        $("advancedOptionsButton").innerHTML = "Show Advanced Options";
      } else {
        $("advancedOptions").style.display = "table-row-group";
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
      MainPort.Listener({
        name: "showHelpDialog",
        html: BG.helpDialogHtml(true, true, "Command Listing"),
        optionUrl: location.href,
        advanced: bgSettings.get("showAdvancedCommands")
      });
    };

    saveOptions = function() {
      var btn = $("saveOptions");
      if (btn.disabled) {
        return;
      }
      Option.saveOptions();
      btn.disabled = true;
      btn.innerHTML = "No Changes";
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

    $("saveOptions").addEventListener("click", saveOptions);
    $("advancedOptionsButton").addEventListener("click", toggleAdvancedOptions);
    toggleAdvancedOptions({preventDefault: function() {}});
    $("showCommands").addEventListener("click", activateHelpDialog);
    $("filterLinkHints").addEventListener("click", maintainLinkHintsView);
    _ref = document.getElementsByClassName("nonEmptyTextOption");
    for (_i = _ref.length; 0 <= --_i; ) {
      element = _ref[_i];
      element.className = element.className + " example info";
      element.innerHTML = "Leave empty to reset this option.";
    }
    maintainLinkHintsView();
    window.onbeforeunload = function() {
      if (!$("saveOptions").disabled) {
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
  
  initPopupPage = function(tab) {
    var exclusions, onUpdated, saveOptions, updateState, url, hasNew;
    exclusions = null;
    tab = tab[0];
    url = BG.urlForTab[tab.id] || tab.url;
    hasNew = false;
    var escapeRegex = /[&<>]/g, escapeCallback = function(c, n) {
      n = c.charCodeAt(0);
      return (n === 60) ? "&lt;" : (n === 62) ? "&gt;" : "&amp;";
    },
    updateState = function() {
      var pass = bgExclusions.getTemp(url, exclusions.readValueFromElement(true));
      $("state").innerHTML = "Vimium++ will " + (pass
        ? "exclude: <span class='code'>" + pass.replace(escapeRegex, escapeCallback) + "</span>"
        : pass !== null ? "be disabled" : "be enabled");
    };
    onUpdated = function() {
      var btn = $("saveOptions");
      $("helpText").innerHTML = "Type <strong>Ctrl-Enter</strong> to save and close.";
      btn.removeAttribute("disabled");
      btn.innerHTML = "Save Changes";
      if (exclusions) {
        hasNew = true;
        updateState();
      }
    };
    saveOptions = function() {
      var btn = $("saveOptions");
      if (btn.disabled) {
        return;
      }
      Option.saveOptions();
      hasNew = false;
      btn.innerHTML = "Saved";
      btn.disabled = true;
      // although the tab calls window.onfocus after this popup page closes,
      // it is too early for the tab to know new exclusion rules.
      var pass = bgExclusions.getPattern(url);
      BG.g_requestHandlers.setIcon(tab.id, null, pass);
    };
    $("saveOptions").addEventListener("click", saveOptions);
    document.addEventListener("keyup", function(event) {
      if (event.ctrlKey && event.keyCode === 13) {
        saveOptions();
        setTimeout(window.close, 300);
      }
    });
    exclusions = new ExclusionRulesOnPopupOption(url, "exclusionRules", onUpdated);
    updateState();
    window.onunload = function() {
      if (hasNew) {
        bgExclusions.rebuildRegex();
      }
    }
  };

  var onDOMLoaded;
  document.addEventListener("DOMContentLoaded", onDOMLoaded = function() {
    document.removeEventListener("DOMContentLoaded", onDOMLoaded);
    onDOMLoaded = null;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/pages/exclusions.html", true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        $("exclusionScrollBox").innerHTML = xhr.responseText;
        if (window.location.pathname.endsWith("popup.html")) {
          chrome.tabs.query({currentWindow: true, active: true}, initPopupPage);
        } else if (location.pathname.endsWith("options.html") >= 0) {
          initOptionsPage();
        }
      }
    };
    xhr.send();
  });

})();
