"use strict";
var Marks = {
  onKeypress: null,
  activate: function(_0, options) {
    var isGo = options.mode !== "create";
    this.onKeypress = isGo ? this._goto : this._create;
    handlerStack.push(this.onKeydown, this);
    VHUD.show((isGo ? "Go" : "Create") + " mark ...");
  },
  clearLocal: function() {
    var key_start, storage, i, key;
    this._previous = null;
    key_start = this.getLocationKey("");
    try {
    storage = localStorage;
    for (i = storage.length; 0 <= --i; ) {
      key = storage.key(i);
      if (key.startsWith(key_start)) {
        storage.removeItem(key);
      }
    }
    } catch (e) {}
    VHUD.showForDuration("Local marks have been cleared.", 1000);
  },
  onKeydown: function(event) {
    var keyCode = event.keyCode, keyChar;
    if (keyCode === KeyCodes.esc ? !KeyboardUtils.isPlain(event)
      : keyCode > KeyCodes.f1 && keyCode <= KeyCodes.f12 || keyCode <= 32
        || !(keyChar = KeyboardUtils.getKeyChar(event, event.shiftKey))) {
      return 1;
    }
    handlerStack.remove(this);
    VHUD.hide();
    keyCode > 32 && this.onKeypress(event, keyChar);
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
    this._previous = {
      scrollX: window.scrollX,
      scrollY: window.scrollY
    };
  },
  _create: function(event, keyChar) {
    if (event.shiftKey) {
      this.CreateGlobalMark({markName: keyChar});
    } else if (keyChar === "`" || keyChar === "'") {
      this.setPreviousPosition();
      VHUD.showForDuration("Created local mark [last].", 1000);
    } else {
      try {
        localStorage[this.getLocationKey(keyChar)] = JSON.stringify({
          scrollX: window.scrollX,
          scrollY: window.scrollY
        });
      } catch (e) {
        VHUD.showForDuration("Failed to creat local mark (localStorage error)", 2000);
        return;
      }
      VHUD.showForDuration("Created local mark : ' " + keyChar + " '.", 1000);
    }
  },
  _goto: function(event, keyChar) {
    var markString, position;
    if (event.shiftKey) {
      MainPort.sendMessage({
        handler: "gotoMark",
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
        VHUD.showForDuration("Jumped to local mark [last]", 1000);
      } else {
        VHUD.showForDuration("Created local mark [last]", 1000);
      }
    } else {
      try {
        markString = localStorage[this.getLocationKey(keyChar)];
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
    var keyChar = request.markName;
    if (window.top !== window && !request.force) {
      MainPort.port.postMessage({handler: "createMark", markName: keyChar});
      VHUD.hide();
      return;
    }
    MainPort.port.postMessage({
      handler: "createMark",
      markName: keyChar,
      url: Marks.getBaseUrl(),
      scroll: [window.scrollX, window.scrollY]
    });
    VHUD.showForDuration("Created global mark : ' " + keyChar + " '.", 1000);
  },
  Goto: function(request) {
    var scroll = request.scroll;
    if (!document.body || !(document.body instanceof HTMLFrameSetElement)) {
      window.focus();
    }
    if (request.markName) {
      Marks.setPreviousPosition();
      window.scrollTo(scroll[0], scroll[1]);
      VHUD.showForDuration("Jumped to global mark : ' " + request.markName + " '.", 2000);
    } else {
      window.scrollTo(scroll[0], scroll[1]);
    }
  }
};
