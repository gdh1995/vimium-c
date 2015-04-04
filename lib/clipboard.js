"use strict";
var Clipboard = {
  _textArea: undefined,
  _getTextArea: function() {
    if (! this._textArea) {
      this._textArea = document.createElement("textarea");
      this._textArea.style.position = "absolute";
      this._textArea.style.left = "-100%";
    }
    return this._textArea;
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
