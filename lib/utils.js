"use strict";
var Utils = {
  makeListRenderBySplit: function(template) {
    var o = null, a = template.split(/\{\{([^\}]+)\}\}/g)
      , f = function(w, i) { return (i & 1) && (w = o[w], w == null) ? "" : w; }
      , m = function(i) { o = i; return a.map(f).join(""); };
    template = null;
    return function(objectArray) {
      var html = objectArray.map(m).join("");
      o = null;
      return html;
    };
  },
  decodeTextFromHtml: function(html) {
    var tmp = document.createElement("div");
    tmp.innerHTML = html;
    html = tmp.innerText;
    return html;
  },
  jsUrlRegex: /^javascript:/i,
  evalIfOK: function(url) {
    if (this.jsUrlRegex.test(url)) {
      // TODO: js should be executed in the frontend, since
      // * we have no permission to run js on another extension' page
      // * in case that some extensions may allow `eval`
      MainPort.port.postMessage({ handler: "openUrlInCurrentTab", url: url });
      return true;
    }
    return false;
  },
  spacesRegex: /[\s\u3000]+/g,
  _escapeRegex: /[&<>]/g,
  _escapeCallback: function(c, n) {
    n = c.charCodeAt(0);
    return (n === 60) ? "&lt;" : (n === 62) ? "&gt;" : "&amp;";
  },
  escapeHtml: function(s) {
    return s.replace(this._escapeRegex, this._escapeCallback);
  },
  decodeURL: function(url) {
    try {
      url = window.decodeURI(url);
    } catch (e) {
    }
    return url;
  },
  _upperRegex: /[A-Z]/,
  hasUpperCase: function(s) {
    return this._upperRegex.test(s);
  }
};
Utils.__proto__ = null;
