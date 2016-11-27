"use strict";
var VMarks = {
  onKeypress: null,
  prefix: true,
  activate: function(_0, options) {
    var isGo = options.mode !== "create";
    this.onKeypress = isGo ? this._goto : this._create;
    this.prefix = options.prefix !== false;
    VHandler.push(this.onKeydown, this);
    VHUD.show((isGo ? "Go to" : "Create") + " mark...");
  },
  clearLocal: function() {
    var keyStart, storage, i, key;
    this._previous = null;
    keyStart = this.getLocationKey("");
    try {
    storage = localStorage;
    for (i = storage.length; 0 <= --i; ) {
      key = storage.key(i);
      if (key.startsWith(keyStart)) {
        storage.removeItem(key);
      }
    }
    } catch (e) {}
    VHUD.showForDuration("Local marks have been cleared.", 1000);
  },
  onKeydown: function(event) {
    var keyCode = event.keyCode, keyChar, cont = !VKeyboard.isEscape(event);
    if (cont && (keyCode > VKeyCodes.f1 && keyCode <= VKeyCodes.f12 || keyCode <= 32
        || !(keyChar = VKeyboard.getKeyChar(event)))) {
      return 1;
    }
    VHandler.remove(this);
    cont && keyCode > 32 ? this.onKeypress(event, keyChar) : VHUD.hide();
    return 2;
  },
  getBaseUrl: function() {
    return window.location.href.split('#', 1)[0];
  },
  getLocationKey: function(keyChar) {
    return "vimiumMark|" + this.getBaseUrl() + "|" + keyChar;
  },
  _previous: null,
  setPreviousPosition: function() {
    this._previous = { scrollX: window.scrollX, scrollY: window.scrollY };
  },
  _create: function(event, keyChar) {
    if (event.shiftKey) {
      if (window.top === window) {
        this.CreateGlobalMark({markName: keyChar});
      } else {
        VPort.port.postMessage({handler: "createMark", markName: keyChar});
        VHUD.hide();
      }
    } else if (keyChar === "`" || keyChar === "'") {
      this.setPreviousPosition();
      VHUD.showForDuration("Created local mark [last].", 1000);
    } else {
      try {
        localStorage.setItem(this.getLocationKey(keyChar),
          JSON.stringify({ scrollX: window.scrollX, scrollY: window.scrollY }));
      } catch (e) {
        VHUD.showForDuration("Failed to creat local mark (localStorage error)", 2000);
        return;
      }
      VHUD.showForDuration("Created local mark : ' " + keyChar + " '.", 1000);
    }
  },
  _goto: function(event, keyChar) {
    var markString, position = null;
    if (event.shiftKey) {
      VPort.sendMessage({
        handler: "gotoMark",
        prefix: this.prefix,
        markName: keyChar
      }, function(req) {
        if (req === false) {
          VHUD.showForDuration("Global mark not set : ' " + keyChar + " '.", 1500);
        }
      });
      VHUD.hide();
    } else if (keyChar === "`" || keyChar === "'") {
      position = this._previous;
      this.setPreviousPosition();
      if (position) {
        window.scrollTo(position.scrollX, position.scrollY);
      }
      markString = position ? "Jumped to" : "Created";
      VHUD.showForDuration(markString + " local mark [last]", 1000);
    } else {
      try {
        markString = localStorage.getItem(this.getLocationKey(keyChar));
      } catch (e) {}
      if (markString) {
        position = JSON.parse(markString);
        this.setPreviousPosition();
        window.scrollTo(position.scrollX, position.scrollY);
        VHUD.showForDuration("Jumped to local mark : ' " + keyChar + " '.", 1000);
      } else {
        VHUD.showForDuration("Local mark not set : ' " + keyChar + " '.", 2000);
      }
    }
  },
  CreateGlobalMark: function(request) {
    VPort.port.postMessage({
      handler: "createMark",
      markName: request.markName,
      url: VMarks.getBaseUrl(),
      scroll: [window.scrollX, window.scrollY]
    });
    VHUD.showForDuration("Created global mark : ' " + request.markName + " '.", 1000);
  },
  Goto: function(request) {
    var scroll = request.scroll, a = request.markName || "";
    (document.body instanceof HTMLFrameSetElement) || window.focus();
    a && VMarks.setPreviousPosition();
    window.scrollTo(scroll[0], scroll[1]);
    a && VHUD.showForDuration("Jumped to global mark : ' " + a + " '.", 2000);
  }
};
