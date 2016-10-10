"use strict";

window.checker = $('keyMappings').model.checker = {
  normalizeKeys: null,
  isKeyReInstalled: false,
  init: function() {
    var keyLeftRe = /<(?!<)((?:[acmACM]-){0,3})(.[^>]*)>/g, lowerRe = /[a-z]/,
    sortModifiers = function(option) {
      return option.length < 4 ? option : option.length > 4 ? "a-c-m-"
        : option === "c-a-" ? "a-c-" : option === "m-a-" ? "a-m-"
        : option === "m-c-" ? "c-m-" : option;
    },
    func = function(_0, option, key) {
      return (option ? ("<" + sortModifiers(option.toLowerCase())) : "<")
        + (lowerRe.test(key) ? key.toLowerCase() : key)
        + ">";
    };
    this.normalizeKeys = function(keys) { return keys.replace(keyLeftRe, func); };
    this.normalizeMap = this.normalizeMap.bind(this);
    this.normalizeOptions = this.normalizeOptions.bind(this);
    this.init = null;
  },
  quoteRe: /"/g,
  normalizeOptions: function(str, value) {
    try {
      value = JSON.parse(value);
    } catch (e) {}
    return str[1] === '"' ? str
      : typeof value !== "string" ? value === true ? "" : str
      : '="' + value.replace(this.quoteRe, '\\"') + '"';
  },
  optionValueRe: /=(\S+)/g,
  normalizeMap: function(_0, cmd, keys, options) {
    var keys2 = this.normalizeKeys(keys);
    if (keys2 !== keys) {
      console.log("KeyMappings Checker:", keys, "is corrected into", keys2);
    }
    options = options.replace(this.optionValueRe, this.normalizeOptions);
    return cmd + keys2 + options;
  },
  mapKeyRe: /(\n[ \t]*(?:un)?map\s+)(\S+)([^\n]*)/g,
  wrapLineRe: /\\\n/g,
  wrapLineRe2: /\\\r/g,
  check: function(string) {
    if (!string) { return string; }
    if (!this.isKeyReInstalled) {
      BG.Commands.setKeyRe(KeyRe.source);
      this.isKeyReInstalled = true;
    }
    string = "\n" + string.replace(this.wrapLineRe, '\\\r');
    string = string.replace(this.mapKeyRe, this.normalizeMap);
    string = string.replace(this.wrapLineRe2, '\\\n').trim();
    return string;
  },
};
checker.init();

(function() {
  var func = loadChecker, _ref, _i, element;
  _ref = document.querySelectorAll("[data-check]");
  for (_i = _ref.length; 0 <= --_i; ) {
    element = _ref[_i];
    element.removeEventListener(element.getAttribute("data-check") || "input", func);
  }
})();
delete window.checker;
