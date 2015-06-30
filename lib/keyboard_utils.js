"use strict";
var KeyCodes = {
  altKey: 18,
  backspace: 8,
  ctrlKey: 17,
  deleteKey: 46,
  down: 40,
  enter: 13,
  esc: 27,
  f1: 112,
  f12: 123,
  left: 37,
  metaKey: 91,
  pageup: 33,
  right: 39,
  shiftKey: 16,
  space: 32,
  tab: 9,
  up: 38
},
KeyboardUtils = {
  init: function() {
    this.init = null;
    if (!this.onMac) { return; }
    this.onMac = true;
    this.correctionMap = {};
    this.correctionMap.__proto__ = null;
  },
  onMac: false,
  keyNames: {
    33: "pageup", 34: "pagedown", 35: "end", 36: "home",
    37: "left", 38: "up", 39: "right", 40: "down",
    112: "f1", 113: "f2", 114: "f3", 115: "f4", 116: "f5", 117: "f6",
    118: "f7", 119: "f8", 120: "f9", 121: "f10", 122: "f11", 123: "f12"
  },
  correctionMap: {
    0: ";:", 1: "=+", 2: ",<", 3: "-_", 4: ".>", 5: "/?", 6: "`~",
    33: "[{", 34: "\\|", 35: "]}", 36: "'\""
  },
  getKeyName: function(event) {
    var keyChar;
    if (keyChar = this.keyNames[event.keyCode]) {
      return event.shiftKey ? keyChar.toUpperCase() : keyChar;
    }
    return "";
  },
  getKeyChar: function(event) {
    var keyIdentifier = event.keyIdentifier, keyId;
    if (! keyIdentifier.startsWith("U+")) {
      return this.getKeyName(event);
    }
    keyId = parseInt(keyIdentifier.substring(2), 16);
    if (keyId > 125) { // 125: '}'; 127: 'delete'
      return (keyIdentifier = this.correctionMap[keyId - 186])
        ? keyIdentifier[event.shiftKey ? 1 : 0] : "";
    }
    keyIdentifier = String.fromCharCode(keyId);
    // It is too hard to handle a space char at background.
    return (keyIdentifier === " ") ? (event.shiftKey ? "SPACE" : "space")
      : event.shiftKey ? keyIdentifier.toUpperCase() : keyIdentifier.toLowerCase();
  },
  isPlain: function(event) {
    return !(event.shiftKey || event.ctrlKey || event.altKey || event.metaKey);
  }
};
KeyCodes.__proto__ = null;
KeyboardUtils.__proto__ = null;
KeyboardUtils.keyNames.__proto__ = null;
KeyboardUtils.correctionMap.__proto__ = null;
