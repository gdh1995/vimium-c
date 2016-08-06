"use strict";
var $$ = document.querySelectorAll.bind(document);

Option.syncToFrontend = [];

Option.prototype._onUpdated = function() {
  this.onUpdated1();
  if (window.VSettings) {
    VSettings.cache[this.field] = this.readValueFromElement();
  }
};

Option.saveOptions = function() {
  var arr = Option.all, i;
  for (i in arr) {
    arr[i].saved || arr[i].save();
  }
};

Option.needSaveOptions = function() {
  var arr = Option.all, i;
  for (i in arr) {
    if (!arr[i].saved) {
      return true;
    }
  }
  return false;
};

Option.prototype.areEqual = function(a, b) {
  return a === b;
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
  this.element.select();
  document.execCommand("insertText", false, value);
  this.locked = false;
};

TextOption.prototype.readValueFromElement = function() {
  return this.element.value.trim().replace(this.whiteMaskRe, ' ');
};

function NonEmptyTextOption() {
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
  var oneline = this.element instanceof HTMLInputElement, str = JSON.stringify(obj, null, oneline ? 1 : 2);
  JSONOption.__super__.populateElement.call(this
    , oneline ? str.replace(/(,?)\n\s*/g, function(_, s) { return s ? ", " : ""; }) : str
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

ExclusionRulesOption.prototype.onRowChange = function(isAdd) {
  var count = this.list.childElementCount;
  if (count - isAdd !== 0) { return; }
  var el = $("exclusionToolbar"), options, i, opt, style;
  el.style.visibility = count > 0 ? "" : "hidden";
  options = el.querySelectorAll('[data-model]');
  for (i = 0; i < options.length; i++) {
    opt = Option.all[options[i].id];
    style = opt.element.parentNode.style;
    style.visibility = isAdd || opt.saved ? "" : "visible";
    style.display = !isAdd && opt.saved ? "none" : "";
  }
};

ExclusionRulesOption.prototype.onInit = function() {
  if (this.previous.length > 0) {
    $("exclusionToolbar").style.visibility = "";
  }
};

(function() {
  var advancedMode, element, onUpdated, func, _i, _ref, status = 0;

  onUpdated = function() {
    var saveBtn;
    if (this.locked) { return; }
    if (this.saved = this.areEqual(this.readValueFromElement(), this.previous)) {
      if (status === 1 && !Option.needSaveOptions()) {
        saveBtn = $("saveOptions");
        saveBtn.disabled = true;
        saveBtn.textContent = "No Changes";
        $("exportButton").disabled = false;
        status = 0;
        window.onbeforeunload = null;
      }
      return;
    } else if (status === 1) {
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

  _ref = $$("[data-model]");
  for (_i = _ref.length; 0 <= --_i; ) {
    element = _ref[_i];
    func = window[element.getAttribute("data-model") + "Option"];
    element.model = new func(element, onUpdated);
  }

  func = loadChecker;
  _ref = $$("[data-check]");
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
    var el = $("advancedOptions");
    el.previousElementSibling.style.display = el.style.display = advancedMode ? "" : "none";
    this.textContent = (advancedMode ? "Hide" : "Show") + " Advanced Options";
  };
  element.onclick(null, true);

  document.addEventListener("keydown", function(event) {
    if (event.keyCode !== 32) { return; }
    var el = event.target;
    if (el instanceof HTMLLabelElement) {
      el.control.click();
      event.preventDefault();
    }
  });

  document.addEventListener("keyup", function(event) {
    if (event.keyCode !== 13) { return; }
    var el = event.target;
    if (el instanceof HTMLAnchorElement) {
      setTimeout(function(el) {
        el.click();
        el.blur();
      }, 0, el);
    } else if (event.ctrlKey || event.metaKey) {
      el.blur();
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
    var target = $(this.getAttribute("data-auto-resize")), delta;
    if (target.scrollHeight <= target.clientHeight) { return; }
    target.style.maxWidth = Math.min(window.innerWidth, 1024) - 120 + "px";
    delta = target.offsetHeight - target.clientHeight;
    delta = target.scrollWidth > target.clientWidth ? Math.max(26, delta) : delta + 18;
    target.style.width = target.scrollWidth +
      (target.offsetWidth - target.clientWidth) + "px";
    target.style.height = target.scrollHeight + delta + "px";
  };
  _ref = $$("[data-auto-resize]");
  for (_i = _ref.length; 0 <= --_i; ) {
    element = _ref[_i];
    element.onclick = func;
    element.tabIndex = 0;
    element.textContent = "Auto resize";
  }

  func = function(event) {
    window._delayed = this.id;
    loadJS("options_ext.js");
    if (this.getAttribute("data-delay") !== "continue") {
      event.preventDefault();
    }
  };
  _ref = $$("[data-delay]");
  for (_i = _ref.length; 0 <= --_i; ) {
    _ref[_i].onclick = func;
  }

  _ref = $$("input[type=checkbox]");
  for (_i = _ref.length; 0 <= --_i; ) {
    element = _ref[_i];
    element.tabIndex = -1;
    element.setAttribute("aria-hidden", "true");
    element.nextElementSibling.tabIndex = 0;
    element.nextElementSibling.setAttribute("for", element.id);
  }

  _ref = $$("[data-permission]");
  if (_ref.length > 0) (function(els) {
    var manifest = chrome.runtime.getManifest(), permissions, i, el, key;
    permissions = manifest.permissions;
    for (i = permissions.length; 0 <= --i; ) {
      manifest[permissions[i]] = true;
    }
    for (i = els.length; 0 <= --i; ) {
      el = els[i];
      key = el.getAttribute("data-permission");
      if (key in manifest) continue;
      el.disabled = true;
      key = el.title = "This option is disabled for lacking permission"
        + (key ? ':\n* ' + key : "");
      if (el instanceof HTMLInputElement && el.type === "checkbox") {
        el.checked = false;
        el = el.nextElementSibling;
        el.removeAttribute("tabindex");
        el.title = key;
      } else {
        el.value = "";
        el.parentElement.onclick = onclick;
      }
    }
    function onclick() {
      var el = this.querySelector("[data-permission]");
      this.onclick = null;
      if (!el) { return; }
      var key = el.getAttribute("data-permission");
      el.placeholder = "lacking permission " + (key ? '"' + key + '"' : "");
    }
  })(_ref);

  function onBeforeUnload() {
    return "You have unsaved changes to options.";
  }
})();

$("importButton").onclick = function() {
  var opt = $("importOptions");
  opt.onchange ? opt.onchange() : $("settingsFile").click();
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
  if (!hash || /[^a-z0-9_.]/i.test(hash)) { return; }
  if (node = document.querySelector('[data-hash="' + hash + '"]')) {
    node.onclick && node.onclick(null, "hash");
  }
};
window.location.hash.length > 4 && setTimeout(window.onhashchange, 50);
