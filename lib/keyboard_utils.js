"use strict";
var KeyCodes = {
  altKey: 18,
  backspace: 8,
  ctrlKey: 17,
  deleteKey: 46,
  enter: 13,
  esc: 27,
  f1: 112,
  f12: 123,
  left: 37,
  metaKey: 91,
  right: 39,
  shiftKey: 16,
  tab: 9
},
KeyboardUtils = {
  init: function(onMac) {
    this.init = null;
    if (!onMac) { return; }
    this.onMac = true;
    this.getKeyChar = function(event) {
      var keyIdentifier = event.keyIdentifier;
      if (! keyIdentifier.startsWith("U+")) {
        return this.getKeyName(event);
      }
      keyIdentifier = String.fromCharCode("0x" + keyIdentifier.substring(2));
      return event.shiftKey ? keyIdentifier.toUpperCase() : keyIdentifier.toLowerCase();
    };
  },
  onMac: false,
  keyNames: {
    33: "pageup",
    34: "pagedown",
    35: "end",
    36: "home",
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
  getKeyName: function(event) {
    var keyChar;
    if (keyChar = this.keyNames[event.keyCode]) {
      return event.shiftKey ? keyChar.toUpperCase() : keyChar;
    }
    return "";
  },
  getKeyChar: function(event) {
    var keyIdentifier = event.keyIdentifier;
    if (! keyIdentifier.startsWith("U+")) {
      return this.getKeyName(event);
    }
    if (keyIdentifier = this.keyIdentifierCorrectionMap[keyIdentifier]) {
      return keyIdentifier[event.shiftKey ? 1 : 0];
    }
    keyIdentifier = String.fromCharCode("0x" + event.keyIdentifier.substring(2));
    return event.shiftKey ? keyIdentifier.toUpperCase() : keyIdentifier.toLowerCase();
  },
  isPlain: function(event) {
    return !(event.shiftKey || event.ctrlKey || event.altKey || event.metaKey);
  }
};
