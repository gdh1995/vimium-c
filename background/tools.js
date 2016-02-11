"use strict";
var Clipboard = {
  _getTextArea: function() {
    var el = document.createElement("textarea");
    el.style.position = "absolute";
    el.style.left = "-100%";
    this._getTextArea = function() { return el; }
    return el;
  },
  copy: function(data) {
    var textArea = this._getTextArea();
    textArea.value = data;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("Copy");
    textArea.remove();
    textArea.value = "";
  },
  paste: function() {
    var textArea = this._getTextArea(), value;
    document.body.appendChild(textArea);
    textArea.focus();
    document.execCommand("Paste");
    value = textArea.value;
    textArea.remove();
    textArea.value = "";
    return value;
  }
};
