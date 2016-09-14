"use strict";
var VKeyCodes = {
  __proto__: null,
  altKey: 18, backspace: 8, ctrlKey: 17, deleteKey: 46, down: 40,
  enter: 13, esc: 27, f1: 112, f12: 123, left: 37, metaKey: 91,
  pageup: 33, shiftKey: 16, space: 32, tab: 9, up: 38
},
VKeyboard = {
  keyNames: ["space", "pageup", "pagedown", "end", "home", "left", "up", "right", "down"],
  correctionMap: {
    __proto__: null,
    0: ";:", 1: "=+", 2: ",<", 3: "-_", 4: ".>", 5: "/?", 6: "`~",
    33: "[{", 34: "\\|", 35: "]}", 36: "'\""
  },
  getKeyName: function(event) {
    var i = event.keyCode, s;
    return i > 111 ? i < 124 ? "fF"[+event.shiftKey] + (i - 111) : ""
      : i > 40 || i < 32 ? ""
      : (s = this.keyNames[i - 32], event.shiftKey ? s.toUpperCase() : s);
  },
  getKeyCharUsingKeyIdentifier: function(event) {
    var keyIdentifier = event.keyIdentifier, keyId;
    if (! keyIdentifier.startsWith("U+")) {
      return this.getKeyName(event);
    }
    keyId = parseInt(keyIdentifier.substring(2), 16);
    if (keyId < 65) {
      return keyId <= 32 ? (keyId !== 32 ? "" : event.shiftKey ? "SPACE" : "space")
      : (event.shiftKey && keyId >= 48 && keyId < 58) ? ")!@#$%^&*("[keyId - 48]
      : String.fromCharCode(keyId);
    } else if (keyId <= 90) {
      return String.fromCharCode(keyId + (event.shiftKey ? 0 : 32));
    } else if (keyId <= 125) {
      return "";
    } else {
      return (keyIdentifier = this.correctionMap[keyId - 186])
        ? keyIdentifier[event.shiftKey ? 1 : 0] : "";
    }
  },
  getKeyChar: function(event) {
    var key;
    if (!event.key) { return this.getKeyCharUsingKeyIdentifier(event); }
    if (key = this.getKeyName(event)) { return key; }
    return (key = event.key).length === 1 ? key : "";
  },
  getKey: function(event, ch) {
    var left = event.metaKey ? "<m-" : "<";
    return event.ctrlKey ? left + (event.altKey ? "c-a-" : "c-") + ch + ">"
      : event.altKey ? left + "a-" + ch + ">"
      : event.metaKey || ch.length > 1 ? left + ch + ">" : ch;
  },
  getKeyStat: function() {
    return event.altKey | (event.ctrlKey << 1) | (event.metaKey << 2) | (event.shiftKey << 3);
  },
  isPlain: function(event) {
    return !(event.shiftKey || event.ctrlKey || event.altKey || event.metaKey);
  }
};
