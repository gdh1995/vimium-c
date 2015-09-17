"use strict";
var Utils = {
  __proto__: null,
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
    }, 0);
    return true;
  },
  _escapeRe: /[&<>]/g,
  _escapeCallback: function(c, n) {
    n = c.charCodeAt(0);
    return (n === 60) ? "&lt;" : (n === 62) ? "&gt;" : "&amp;";
  },
  escapeHtml: function(s) {
    return s.replace(this._escapeRe, this._escapeCallback);
  },
  decodeURL: function(url) {
    try {
      url = window.decodeURI(url);
    } catch (e) {}
    return url;
  },
  upperRe: /[A-Z]/
};
