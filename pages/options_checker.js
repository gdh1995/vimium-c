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
        + (key.length > 1 && lowerRe.test(key) ? key.toLowerCase() : key)
        + ">";
    };
    this.normalizeKeys = function(keys) { return keys.replace(keyLeftRe, func); };
    this.normalizeMap = this.normalizeMap.bind(this);
    this.normalizeOptions = this.normalizeOptions.bind(this);
    this.init = null;
    return BG.Utils.require("Commands");
  },
  quoteRe: /"/g,
  normalizeOptions: function(str, value, s2, tail) {
    if (s2) {
      s2 = s2.replace(BG.Commands.hexCharRe, BG.Commands.onHex);
      value = '"' + s2 + '"';
    }
    try {
      var obj = JSON.parse(value);
      if (typeof obj !== "string") {
        return obj !== true ? str : "";
      }
      value = obj;
    } catch (e) {
      s2 && (value = s2);
    }
    value = value && JSON.stringify(value).replace(this.toHexCharRe, this.onToHex);
    return '=' + value + tail;
  },
  optionValueRe: /=("(\S*(?:\s[^=]*)?)"|\S+)(\s|$)/g,
  toHexCharRe: /\s/g,
  onToHex: function(s) {
    var hex = s.charCodeAt(0) + 0x100000;
    return "\\u" + hex.toString(16).substring(2);
  },
  normalizeMap: function(_0, cmd, keys, options) {
    var keys2 = this.normalizeKeys(keys);
    if (keys2 !== keys) {
      console.log("KeyMappings Checker:", keys, "is corrected into", keys2);
    }
    options = options ? options.replace(this.optionValueRe, this.normalizeOptions) : "";
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
