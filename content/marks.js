"use strict";
var Marks = {
  activateCreateMode: function() {
    handlerStack.push({
      keydown: this.onKeydown,
      keyup: handlerStack.StopProp,
      keypress: this._create,
      _this: this
    });
    VHUD.show("Create mark ...");
  },
  activateGotoMode: function() {
    handlerStack.push({
      keydown: this.onKeydown,
      keyup: handlerStack.StopProp,
      keypress: this._goto,
      _this: this
    });
    VHUD.show("Go to mark ...");
  },
  clearLocal: function() {
    var key_start, storage, i, key;
    this._previous = null;
    key_start = this.getLocationKey("");
    storage = localStorage;
    for (i = storage.length; 0 <= --i; ) {
      key = storage.key(i);
      if (key.startsWith(key_start)) {
        storage.removeItem(key);
      }
    }
    VHUD.showForDuration("Local marks have been cleared.", 1000);
  },
  onKeydown: function() {
    if (event.keyCode === KeyCodes.esc && KeyboardUtils.isPlain(event)) {
      handlerStack.remove();
      VHUD.hide();
      return false;
    }
    return -1;
  },
  getBaseUrl: function() {
    return window.location.href.split('#', 1)[0];
  },
  getLocationKey: function(keyChar) {
    return "vimiumMark|" + this.getBaseUrl() + "|" + keyChar;
  },
  // previousPositionRegisters: ["`", "'"],
  _previous: null,
  setPreviousPosition: function() {
    this._previous = {
      scrollX: window.scrollX,
      scrollY: window.scrollY
    };
  },
  _create: function(event) {
    var keyChar = String.fromCharCode(event.charCode);
    handlerStack.remove();
    if (event.shiftKey) {
      this.CreateGlobalMark({markName: keyChar});
      return;
    }
    if (keyChar === "`" || keyChar === "'") {
      this.setPreviousPosition();
    } else {
      localStorage[this.getLocationKey(keyChar)] = JSON.stringify({
        scrollX: window.scrollX,
        scrollY: window.scrollY
      });
    }
    VHUD.showForDuration("Created local mark '" + keyChar + "'", 1000);
    return false;
  },
  _goto: function(event) {
    var keyChar = String.fromCharCode(event.charCode), markString, position;
    handlerStack.remove();
    if (event.shiftKey) {
      MainPort.postMessage({
        handler: "Marks.gotoMark",
        markName: keyChar
      }, function(req) {
        if (req === false) {
          VHUD.showForDuration("Global mark not set '" + keyChar + "'", 1500);
        }
      });
      VHUD.hide();
      return false;
    }
    if (keyChar === "`" || keyChar === "'") {
      if (!(position = this._previous)) {
        this.setPreviousPosition();
        VHUD.showForDuration("Created local mark '" + keyChar + "'", 1000);
        return;
      }
    } else if (markString = localStorage[this.getLocationKey(keyChar)]) {
      position = JSON.parse(markString);
    }
    if (position) {
      this.setPreviousPosition();
      window.scrollTo(position.scrollX, position.scrollY);
      VHUD.showForDuration("Jumped to local mark ' " + keyChar + " '", 1000);
    } else {
      VHUD.showForDuration("Local mark not set '" + keyChar + "'", 2000);
    }
    return false;
  },
  CreateGlobalMark: function(request) {
    var keyChar = request.markName;
    if (window.top !== window && !request.force) {
      MainPort.postMessage({handler: 'Marks.createMark', markName: keyChar});
      VHUD.hide();
      return;
    }
    MainPort.postMessage({
      handler: 'Marks.createMark',
      markName: keyChar,
      url: Marks.getBaseUrl(),
      scroll: [window.scrollX, window.scrollY]
    });
    VHUD.showForDuration("Created global mark '" + keyChar + "'", 1000);
  },
  Goto: function(request) {
    var scroll = request.scroll;
    if (!document.body || document.body.nodeName.toLowerCase() !== "frameset") {
      window.focus();
    }
    if (request.markName) {
      Marks.setPreviousPosition();
      window.scrollTo(scroll[0], scroll[1]);
      VHUD.showForDuration("Jumped to global mark '" + request.markName + "'", 2000);
    } else {
      window.scrollTo(scroll[0], scroll[1]);
    }
  }
};
Marks.__proto__ = null;
