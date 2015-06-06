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
  getMarkString: function() {
    return JSON.stringify({scrollX: window.scrollX, scrollY: window.scrollY});
  },
  // previousPositionRegisters: ["`", "'"],
  _previous: null,
  setPreviousPosition: function() {
    this._previous = [window.scrollX, window.scrollY];
  },
  _create: function(event) {
    var keyChar = String.fromCharCode(event.charCode);
    handlerStack.remove();
    if (event.shiftKey && keyChar !== "`" && keyChar !== "'") {
      this.CreateGlobalMark({markName: keyChar});
      VHUD.hide();
    } else {
      localStorage[this.getLocationKey(keyChar)] = this.getMarkString();
      VHUD.showForDuration("Created local mark '" + keyChar + "'", 1000);
    }
    return false;
  },
  _goto: function(event) {
    var keyChar = String.fromCharCode(event.charCode), markString, position;
    handlerStack.remove();
    if (keyChar === "`" || keyChar === "'") {
      window.scrollTo(this._previous[0], this._previous[1]);
      VHUD.showForDuration("Jumped to local mark \"" + keyChar + "\"", 1000);
    } else if (event.shiftKey) {
      MainPort.postMessage({
        handler: "gotoMark",
        markName: keyChar
      }, function(req) {
        if (req === false) {
          VHUD.showForDuration("Global mark not set '" + keyChar + "'", 1500);
        }
      });
      VHUD.hide();
    } else if (markString = localStorage[this.getLocationKey(keyChar)]) {
      this.setPreviousPosition();
      position = JSON.parse(markString);
      window.scrollTo(position.scrollX, position.scrollY);
      VHUD.showForDuration("Jumped to local mark '" + keyChar + "'", 1000);
    } else {
      VHUD.showForDuration("Local mark not set '" + keyChar + "'", 1000);
    }
    return false;
  },
  CreateGlobalMark: function(request) {
    var keyChar = request.markName;
    MainPort.postMessage({
      handler: 'createMark',
      markName: keyChar,
      url: Marks.getBaseUrl(),
      scroll: (window.top === window || request.force
        ? [window.scrollX, window.scrollY] : null)
    }, function(req) {
      if (req) {
        VHUD.showForDuration("Created global mark '" + keyChar + "'", 1000);
      }
    });
  },
  Goto: function(request) {
    var scroll = request.scroll;
    window.scrollTo(scroll[0], scroll[1]);
    if (request.markName) {
      VHUD.showForDuration("Jumped to global mark '" + request.markName + "'", 1000);
    }
  }
};