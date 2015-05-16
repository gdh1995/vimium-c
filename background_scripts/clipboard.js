"use strict";
var Clipboard = {
  _textArea: undefined,
  _getTextArea: function() {
    var el = this._textArea;
    if (! el) {
      el = this._textArea = document.createElement("textarea");
      el.style.position = "absolute";
      el.style.left = "-100%";
    }
    return el;
  },
  copy: function(data) {
    var textArea = this._getTextArea();
    textArea.value = data;
    document.documentElement.appendChild(textArea);
    textArea.select();
    document.execCommand("Copy");
    document.documentElement.removeChild(textArea);
    textArea.value = "";
  },
  paste: function() {
    var textArea = this._getTextArea(), value;
    document.documentElement.appendChild(textArea);
    textArea.focus();
    document.execCommand("Paste");
    value = textArea.value;
    document.documentElement.removeChild(textArea);
    textArea.value = "";
    return value;
  }
};
