"use strict";
var Marks = {
  activateCreateMode: function() {
    handlerStack.push({
      keydown: this._createOnKeyDown,
      _this: this
    });
  },
  activateGotoMode: function() {
    handlerStack.push({
      keydown: this._gotoOnKeyDown,
      _this: this
    });
  },
  upperRegex: /^[A-Z]$/,
  lowerRegex: /^[a-z]$/,
  _createOnKeyDown: function(event) {
    var keyChar;
    keyChar = KeyboardUtils.getKeyChar(event);
    if (keyChar === "") {
      return false;
    }
    if (this.upperRegex.test(keyChar)) { // TODO: check keyChar more strictly
      MainPort.postMessage({
        handler: 'createMark',
        markName: keyChar,
        scroll: [window.scrollX, window.scrollY]
      }, function(req) {
        if (req) {
          VHUD.showForDuration("Created global mark '" + keyChar + "'", 1000);
        }
      });
    } else if (this.lowerRegex.test(keyChar)) {
      localStorage["vimiumMark|" + this.getUrl() + "|" + keyChar] =
        JSON.stringify([window.scrollX, window.scrollY]);
      VHUD.showForDuration("Created local mark '" + keyChar + "'", 1000);
    }
    handlerStack.remove();
    return false;
  },
  _gotoOnKeyDown: function(event) {
    var keyChar, mark, markString;
    keyChar = KeyboardUtils.getKeyChar(event);
    if (keyChar === "") {
      return false;
    }
    if (this.upperRegex.test(keyChar)) {
      MainPort.postMessage({
        handler: 'gotoMark',
        markName: keyChar
      });
    } else if (this.lowerRegex.test(keyChar)) {
      markString = localStorage["vimiumMark|" + this.getUrl() + "|" + keyChar];
      if (markString != null) {
        mark = JSON.parse(markString);
        window.scrollTo(mark[0], mark[1]);
        VHUD.showForDuration("Jumped to local mark '" + keyChar + "'", 1000);
      }
    }
    handlerStack.remove();
    return false;
  },
  goTo: function(request) {
    var scroll = request.scroll;
    window.scrollTo(scroll[0], scroll[1]);
    if (request.markName) {
      VHUD.showForDuration("Jumped to global mark '" + request.markName + "'", 1000);
    }
  },
  getUrl: function() {
    return window.location.href.split(/#?/, 1)[0];
  }
};