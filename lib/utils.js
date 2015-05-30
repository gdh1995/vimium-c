"use strict";
var Utils = {
  invokeCommandString: function(str, arg) {
    var components = str.split('.'), obj = window, _i, _len, _ref;
    for (_i = 0, _len = components.length - 1; _i < _len; _i++) {
      obj = obj[components[_i]];
    }
    obj[components[_len]](arg);
  },
  makeListRenderBySplit: function(template) {
    var o = null, a = template.split(/\{\{([^\}]+)\}\}/g)
      , f = function(w, i) { return (i & 1) ? (w in o ? o[w] : "") : w; }
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
  _spaceRegex: /[\xa0\u3000]/g,
  correctSpace: function(str) {
    return str.replace(this._spaceRegex, ' ');
  },
  _escapeRegex: /[&<>]/g,
  _escapeCallback: function(c, n) {
    n = c.charCodeAt(0);
    return (n === 60) ? "&lt;" : (n === 62) ? "&gt;" : "&amp;";
  },
  escapeHtml: function(s) {
    return s.replace(this._escapeRegex, this._escapeCallback);
  },
  createUniqueId: (function() {
    var i = 1;
    return function() {
      return ++i;
    };
  })(),
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

window.extend = function(hash1, hash2) {
  for (var key in hash2) {
    hash1[key] = hash2[key];
  }
  return hash1;
};
