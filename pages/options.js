"use strict";

Option.saveOptions = function() {
  for (var arr = Option.all, i = arr.length; 0 <= --i; ) {
    arr[i].saved || arr[i].save();
  }
};

Option.needSaveOptions = function() {
  for (var arr = Option.all, i = arr.length; 0 <= --i; ) {
    if (!arr[i].saved) {
      return true;
    }
  }
  return false;
};

Option.prototype.areEqual = function(a, b) {
  return this.saved = a === b;
};

function NumberOption() {
  NumberOption.__super__.constructor.apply(this, arguments);
  this.element.oninput = this.onUpdated;
}
__extends(NumberOption, Option);

NumberOption.prototype.populateElement = function(value) {
  this.element.value = value;
};

NumberOption.prototype.readValueFromElement = function() {
  return parseFloat(this.element.value);
};

function TextOption() {
  TextOption.__super__.constructor.apply(this, arguments);
  this.element.oninput = this.onUpdated;
}
__extends(TextOption, Option);

TextOption.prototype.whiteRe = / /g;
TextOption.prototype.whiteMaskRe = /\xa0/g;
TextOption.prototype.populateElement = function(value, enableUndo) {
  value = value.replace(this.whiteRe, '\xa0');
  if (enableUndo !== true) {
    this.element.value = value;
    return;
  }
  this.locked = true;
  this.element.focus();
  document.execCommand("undo");
  this.element.setSelectionRange(0, this.element.value.length);
  document.execCommand("insertText", false, value);
  this.locked = false;
};

TextOption.prototype.readValueFromElement = function() {
  return this.element.value.trim().replace(this.whiteMaskRe, ' ');
};

function NonEmptyTextOption(element) {
  NonEmptyTextOption.__super__.constructor.apply(this, arguments);
}
__extends(NonEmptyTextOption, TextOption);

NonEmptyTextOption.prototype.readValueFromElement = function() {
  var value = NonEmptyTextOption.__super__.readValueFromElement.call(this);
  if (!value) {
    value = bgSettings.defaults[this.field];
    this.populateElement(value, true);
  }
  return value;
};

function JSONOption() {
  JSONOption.__super__.constructor.apply(this, arguments);
}
__extends(JSONOption, TextOption);

JSONOption.prototype.populateElement = function(obj, enableUndo) {
  JSONOption.__super__.populateElement.call(this
    , JSON.stringify(obj, null, this.element instanceof HTMLInputElement ? 1 : 2)
    , enableUndo);
};

JSONOption.prototype.readValueFromElement = function() {
  var value = JSONOption.__super__.readValueFromElement.call(this), obj;
  if (value) {
    try {
      obj = JSON.parse(value);
    } catch (e) {
      obj = null;
    }
  } else {
    obj = bgSettings.defaults[this.field];
    this.populateElement(obj, true);
  }
  return obj;
};

JSONOption.prototype.areEqual = Option.areJSONEqual;

function CheckBoxOption() {
  CheckBoxOption.__super__.constructor.apply(this, arguments);
  this.element.onchange = this.onUpdated;
}
__extends(CheckBoxOption, Option);

CheckBoxOption.prototype.populateElement = function(value) {
  this.element.checked = value;
};

CheckBoxOption.prototype.readValueFromElement = function() {
  return this.element.checked;
};

(function() {
  var advancedMode, element, onUpdated, func, _i, _ref, status = 0;

  onUpdated = function() {
    var saveBtn;
    if (this.locked) { return; }
    if (this.areEqual(this.readValueFromElement(), this.previous)) {
      if (status == 1 && !Option.needSaveOptions()) {
        saveBtn = $("saveOptions");
        saveBtn.disabled = true;
        saveBtn.textContent = "No Changes";
        $("exportButton").disabled = false;
        status = 0;
        window.onbeforeunload = null;
      }
      return;
    } else if (status == 1) {
      return;
    }
    window.onbeforeunload = onBeforeUnload;
    status = 1;
    saveBtn = $("saveOptions");
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Changes";
    $("exportButton").disabled = true;
  };

  $("saveOptions").onclick = function(virtually) {
    var toSync;
    if (virtually !== false) {
      Option.saveOptions();
    }
    toSync = Option.syncToFrontend;
    Option.syncToFrontend = [];
    this.disabled = true;
    this.textContent = "No Changes";
    $("exportButton").disabled = false;
    status = 0;
    window.onbeforeunload = null;
    setTimeout(function () {
      var event = new FocusEvent("focus"), i, key, ref, obj;
      window.dispatchEvent(event);
      i = toSync.length;
      if (i === 0) { return; }
      ref = bgSettings.bufferToLoad;
      obj = {name: "settingsUpdate"};
      while (0 <= --i) {
        key = toSync[i];
        obj[key] = ref[key] = bgSettings.get(key);
      }
      bgSettings.broadcast(obj);
    }, 100);
  };

  _ref = document.querySelectorAll("[data-model]");
  for (_i = _ref.length; 0 <= --_i; ) {
    element = _ref[_i];
    func = window[element.getAttribute("data-model") + "Option"];
    element.model = new func(element, onUpdated);
  }

  func = loadChecker;
  _ref = document.querySelectorAll("[data-check]");
  for (_i = _ref.length; 0 <= --_i; ) {
    element = _ref[_i];
    element.addEventListener(element.getAttribute("data-check") || "input", func);
  }

  advancedMode = bgSettings.get("showAdvancedOptions");
  element = $("advancedOptionsButton");
  element.onclick = function(_0, init) {
    if (init == null || (init === "hash" && advancedMode === false)) {
      advancedMode = !advancedMode;
      bgSettings.set("showAdvancedOptions", advancedMode);
    }
    $("advancedOptions").style.display = advancedMode ? "" : "none";
    this.textContent = (advancedMode ? "Hide" : "Show") + " Advanced Options";
  };
  element.onclick(null, true);

  document.addEventListener("keyup", function(event) {
    if ((event.ctrlKey || event.metaKey) && event.keyCode === 13) {
      document.activeElement.blur();
      if (status != 0) {
        $("saveOptions").onclick();
      }
    }
  });

  _ref = document.getElementsByClassName("nonEmptyTextOption");
  for (_i = _ref.length; 0 <= --_i; ) {
    element = _ref[_i];
    element.className += " example info";
    element.textContent = "Delete all to reset this option.";
  }

  func = function() {
    var target = $(this.getAttribute("data-auto-scale")), delta;
    if (target.scrollHeight <= target.clientHeight) { return; }
    target.style.maxWidth = Math.min(window.innerWidth, 1024) - 120 + "px";
    delta = target.offsetHeight - target.clientHeight;
    target.style.width = target.scrollWidth + 3 +
      (target.offsetWidth - target.clientWidth) + "px";
    target.style.height = target.scrollHeight + 20 + delta + "px";
  };
  _ref = document.querySelectorAll("[data-auto-scale]");
  for (_i = _ref.length; 0 <= --_i; ) {
    element = _ref[_i];
    element.onclick = func;
    element.textContent = "Scale to fit";
  }

  func = function() {
    window._delayed = this.id;
    loadJS("options_ext.js");
  };
  _ref = document.querySelectorAll("[data-delay]");
  for (_i = _ref.length; 0 <= --_i; ) {
    _ref[_i].onclick = func;
  }

  function onBeforeUnload() {
    return "You have unsaved changes to options.";
  }
})();

$("importButton").onclick = function() {
  $("settingsFile").click();
};

function loadJS(file) {
  document.head.appendChild(document.createElement("script")).src = file;
}

function loadChecker() {
  if (loadChecker.loaded) { return; }
  loadChecker.loaded = true;
  loadJS("options_checker.js");
}

window.onhashchange = function() {
  var hash = window.location.hash, node;
  hash = hash.substring(hash[1] === "!" ? 2 : 1);
  if (!hash || /[^a-z0-9_\.]/i.test(hash)) { return; }
  if (node = document.querySelector('[data-hash="' + hash + '"]')) {
    node.onclick && node.onclick(null, "hash");
  }
};
window.location.hash.length > 4 && setTimeout(window.onhashchange, 50);
