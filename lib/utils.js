"use strict";
var Utils = {
  makeNullProto: function() {
    return {__proto__: null};
  },
  setNullProto: function(obj) {
    obj.__proto__ = null;
  },
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
    var tmp = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
    tmp.innerHTML = html;
    html = tmp.innerText;
    return html;
  },
  isJSUrl: function(url) {
    return url.substring(0, 11).toLowerCase() === "javascript:";
  },
  evalIfOK: function(url) {
    if (!this.isJSUrl(url)) {
      return false;
    }
    setTimeout(function() {
      var script = document.createElementNS("http://www.w3.org/1999/xhtml", "script");
      script.type = "text/javascript";
      script.textContent = Utils.decodeURL(url).substring(11).trim();
      (document.body || document.documentElement).appendChild(script);
      script.remove();
    }, 0);
    return true;
  },
  findCommand: function(parent, command) {
    var keys = command.split('.'), i, len;
    for (i = 0, len = keys.length - 1; i < len; i++) {
      parent = parent[keys[i]];
    }
    return [parent, keys[i]];
  },
  decodeURL: function(url, decode) {
    try {
      url = (decode || window.decodeURI)(url);
    } catch (e) {}
    return url;
  }
};

if (!String.prototype.startsWith) {
String.prototype.startsWith = function(s) {
  return this.length >= s.length && this.lastIndexOf(s, 0) === 0;
};
String.prototype.endsWith || (String.prototype.endsWith = function(s) {
  var i = this.length - s.length;
  return i >= 0 && this.indexOf(s, i) !== -1;
});
}
