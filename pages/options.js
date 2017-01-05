"use strict";
var $$ = document.querySelectorAll.bind(document);

Option.syncToFrontend = [];

Option.prototype._onCacheUpdated = function(func) {
  func.call(this);
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

Option.prototype.atomicUpdate = function(value, undo, locked) {
  if (undo) {
    this.locked = true;
    document.activeElement !== this.element && this.element.focus();
    document.execCommand("undo");
  }
  this.locked = locked;
  this.element.select();
  document.execCommand("insertText", false, value);
  this.locked = false;
};

function NumberOption() {
  NumberOption.__super__.constructor.apply(this, arguments);
  this.element.oninput = this.onUpdated;
  this.element.onfocus = this.addWheelListener.bind(this);
}
__extends(NumberOption, Option);

NumberOption.prototype.populateElement = function(value) {
  this.element.value = value;
};

NumberOption.prototype.readValueFromElement = function() {
  return parseFloat(this.element.value);
};

NumberOption.prototype.addWheelListener = function() {
  var el = this.element, func = this.OnWheel.bind(this.element, this), onBlur;
  el.wheelTime = 0;
  el.addEventListener("mousewheel", func, {passive: false});
  el.addEventListener("blur", onBlur = function() {
    this.removeEventListener("mousewheel", func, {passive: false});
    this.removeEventListener("blur", onBlur);
    this.wheelTime = 0;
  });
};

NumberOption.prototype.OnWheel = function(option, event) {
  event.preventDefault();
  var oldTime, inc, step, i, val0, val, func;
  oldTime = this.wheelTime; i = Date.now();
  if (i - oldTime < 100 && oldTime > 0) { return; }
  this.wheelTime = i;
  inc = event.wheelDelta > 0; val0 = this.value;
  func = inc ? this.stepUp : this.stepDown;
  if (typeof func === "function") {
    func.call(this);
    val = this.value;
    this.value = val0;
  } else {
    func = parseFloat;
    step = func(this.step) || 1;
    i = (+this.value || 0) + (inc ? step : -step);
    isNaN(step = func(this.max)) || (i = Math.min(i, step));
    isNaN(step = func(this.min)) || (i = Math.max(i, step));
    val = "" + i;
  }
  option.atomicUpdate(val, oldTime > 0, false);
};

function TextOption() {
  TextOption.__super__.constructor.apply(this, arguments);
  this.element.oninput = this.onUpdated;
  this.converter = this.element.getAttribute("data-converter") || "";
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
  this.atomicUpdate(value, true, true);
};

TextOption.prototype.readValueFromElement = function() {
  var value = this.element.value.trim().replace(this.whiteMaskRe, ' ');
  if (value && this.converter) {
    value = this.converter === "lower" ? value.toLowerCase()
      : this.converter === "upper" ? value.toUpperCase()
      : value;
  }
  return value;
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
  BG.Utils.require("Exclusions");
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
        saveBtn.firstChild.data = "No Changes";
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
    saveBtn.firstChild.data = "Save Changes";
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
    this.firstChild.data = "No Changes";
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
    new func(element, onUpdated);
  }

  func = loadChecker;
  _ref = $$("[data-check]");
  for (_i = _ref.length; 0 <= --_i; ) {
    element = _ref[_i];
    element.addEventListener(element.getAttribute("data-check") || "input", func);
  }

  advancedMode = false;
  element = $("advancedOptionsButton");
  element.onclick = function(_0, init) {
    if (init == null || (init === "hash" && bgSettings.get("showAdvancedOptions") === false)) {
      advancedMode = !advancedMode;
      bgSettings.set("showAdvancedOptions", advancedMode);
    } else {
      advancedMode = bgSettings.get("showAdvancedOptions");
    }
    var el = $("advancedOptions");
    el.previousElementSibling.style.display = el.style.display = advancedMode ? "" : "none";
    this.firstChild.data = (advancedMode ? "Hide" : "Show") + " Advanced Options";
    this.setAttribute("data-checked", "" + advancedMode);
  };
  element.onclick(null, true);

  document.addEventListener("keydown", function(event) {
    if (event.keyCode !== 32) { return; }
    var el = event.target;
    if ((el instanceof HTMLLabelElement) && !el.isContentEditable) {
      event.preventDefault();
    }
  });

  document.addEventListener("keyup", function(event) {
    var el, i = event.keyCode;
    if (i !== 13) {
      if (i !== 32) { return; }
      el = event.target;
      if ((el instanceof HTMLLabelElement) && !el.isContentEditable) {
        el.control.click();
        event.preventDefault();
      }
      return;
    }
    el = event.target;
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
    var target = $(this.getAttribute("data-auto-resize")), delta, height;
    if (target.scrollHeight <= target.clientHeight && target.scrollWidth <= target.clientWidth) { return; }
    target.style.height = target.style.width = "";
    target.style.maxWidth = Math.min(window.innerWidth, 1024) - 120 + "px";
    height = target.scrollHeight;
    delta = target.offsetHeight - target.clientHeight;
    delta = target.scrollWidth > target.clientWidth ? Math.max(26, delta) : delta + 18;
    height += delta;
    delta = target.scrollWidth - target.clientWidth;
    if (delta > 0) {
      target.style.width = target.offsetWidth + delta + "px";
    }
    target.style.height = height + "px";
  };
  _ref = $$("[data-auto-resize]");
  for (_i = _ref.length; 0 <= --_i; ) {
    element = _ref[_i];
    element.onclick = func;
    element.tabIndex = 0;
    element.textContent = "Auto resize";
  }

  func = function(event) {
    var str = this.getAttribute("data-delay"), e = null;
    if (str !== "continue") {
      event.preventDefault();
    }
    if (str === "event") { e = event; }
    window._delayed = [this.id, e];
    loadJS("options_ext.js");
  };
  _ref = $$("[data-delay]");
  for (_i = _ref.length; 0 <= --_i; ) {
    _ref[_i].onclick = func;
  }

  if (window.location.hash === "#chrome-ui") {
    document.getElementById("mainHeader").remove();
    element = document.getElementById("openInTab");
    element.style.display = "";
    element.onclick = function() {
      this.href = bgSettings.CONST.OptionsPage;
      this.target = "_blank";
      window.close();
    };
    element.previousElementSibling.remove();
    _ref = $$("body,button,header");
    for (_i = _ref.length; 0 <= --_i; ) {
      _ref[_i].classList.add("chrome-ui");
    }
    devicePixelRatio !== 1 && (document.body.style.width = 940 / devicePixelRatio + "px");
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
      key = "This option is disabled for lacking permission"
        + (key ? ':\n* ' + key : "");
      if (el instanceof HTMLInputElement && el.type === "checkbox") {
        el.checked = false;
        el = el.parentElement;
        el.title = key;
      } else {
        el.value = "";
        el.title = key;
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

  function toggleHide(element) {
    element.tabIndex = -1;
    element.setAttribute("aria-hidden", "true");
  }

  _ref = $$('[data-model="CheckBox"]');
  for (_i = _ref.length; 0 <= --_i; ) {
    element = _ref[_i];
    if (element.disabled) { continue; }
    toggleHide(element);
    toggleHide(element.parentElement);
    element = element.nextElementSibling;
    element.classList.add("checkboxHint");
    element.setAttribute("role", "button");
    element.tabIndex = 0;
    element.setAttribute("aria-hidden", "false");
  }

  function onBeforeUnload() {
    return "You have unsaved changes to options.";
  }
})();

$("importButton").onclick = function() {
  var opt = $("importOptions");
  opt.onchange ? opt.onchange() : $("settingsFile").click();
};

function loadJS(file) {
  var script = document.createElement("script");
  script.src = file;
  return document.head.appendChild(script);
}

function loadChecker() {
  if (loadChecker.loaded) { return; }
  loadChecker.loaded = true;
  loadJS("options_checker.js");
}

window.onhashchange = function() {
  var hash = window.location.hash, node;
  hash = hash.substring(hash[1] === "!" ? 2 : 1);
  if (!hash || /[^a-z\d_.]/i.test(hash)) { return; }
  if (node = document.querySelector('[data-hash="' + hash + '"]')) {
    node.onclick && node.onclick(null, "hash");
  }
};
window.location.hash.length > 4 && setTimeout(window.onhashchange, 50);
