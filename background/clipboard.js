"use strict";
var Clipboard = {
  __proto__: null,
  _textArea: null,
  copy: function(data) {
    var textArea = this._textArea;
    textArea.value = data;
    document.documentElement.appendChild(textArea);
    textArea.select();
    document.execCommand("Copy");
    document.documentElement.removeChild(textArea);
    textArea.value = "";
  },
  paste: function() {
    var textArea = this._textArea, value;
    document.documentElement.appendChild(textArea);
    textArea.focus();
    document.execCommand("Paste");
    value = textArea.value;
    document.documentElement.removeChild(textArea);
    textArea.value = "";
    return value;
  }
};

(function() {
  var el;
  el = Clipboard._textArea = document.createElement("textarea");
  el.style.position = "absolute";
  el.style.left = "-100%";
})();
