"use strict";
var KeyboardUtils = (
    (navigator.userAgent.indexOf("Mac") !== -1) ? "Mac"
  : (navigator.userAgent.indexOf("Linux") !== -1) ? "Linux"
  : "Windows"
), KeyCodes = {
  esc: 27,
  backspace: 8,
  deleteKey: 46,
  enter: 13,
  space: 32,
  shiftKey: 16,
  metaKey: 91,
  ctrlKey: 17,
  altKey: 18,
  left: 37,
  up: 38,
  right: 39,
  down: 40,
  f1: 112,
  f12: 123,
  tab: 9
};
KeyboardUtils = {
  platform: KeyboardUtils,
  keyNames: {
    37: "left",
    38: "up",
    39: "right",
    40: "down",
    112: "f1",
    113: "f2",
    114: "f3",
    115: "f4",
    116: "f5",
    117: "f6",
    118: "f7",
    119: "f8",
    120: "f9",
    121: "f10",
    122: "f11",
    123: "f12"
  },
  keyIdentifierCorrectionMap: {
    "U+00C0": "`~",
    "U+00BD": "-_",
    "U+00BB": "=+",
    "U+00DB": "[{",
    "U+00DD": "]}",
    "U+00DC": "\|",
    "U+00BA": ";:",
    "U+00DE": "'\"",
    "U+00BC": ",<",
    "U+00BE": ".>",
    "U+00BF": "/?"
  },
  getKeyChar: ((KeyboardUtils !== "Mac")
    ? function(event) {
      var keyIdentifier = event.keyIdentifier;
      if (! keyIdentifier.startsWith("U+")) {
        if (keyIdentifier = this.keyNames[event.keyCode]) {
          return event.shiftKey ? keyIdentifier.toUpperCase() : keyIdentifier;
        }
        return "";
      }
      if (keyIdentifier = this.keyIdentifierCorrectionMap[keyIdentifier]) {
        return keyIdentifier[event.shiftKey ? 1 : 0];
      }
      keyIdentifier = String.fromCharCode(event.keyIdentifier.replace("U+", "0x"));
      return event.shiftKey ? keyIdentifier.toUpperCase() : keyIdentifier.toLowerCase();
    }
    : function(event) {
      var keyIdentifier = event.keyIdentifier;
      if (! keyIdentifier.startsWith("U+")) {
        if (keyIdentifier = this.keyNames[event.keyCode]) {
          return event.shiftKey ? keyIdentifier.toUpperCase() : keyIdentifier;
        }
        return "";
      }
      keyIdentifier = String.fromCharCode(keyIdentifier.replace("U+", "0x"));
      return event.shiftKey ? keyIdentifier.toUpperCase() : keyIdentifier.toLowerCase();
    }
  ),
  isPlain: function(event) {
    return !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
  },
  isPrintable: function(event) {
    return !(event.metaKey || event.ctrlKey || event.altKey) && this.getKeyChar(event).length === 1;
  }
};
