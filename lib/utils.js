"use strict";
var Utils = {
  makeListRenderBySplit: function(template) {
    var o = null, a = template.split(/\{\{(\w+)}}/g)
      , f = function(w, i) { return (i & 1) && (w = o[w]) == null ? "" : w; }
      , m = function(i) { o = i; return a.map(f).join(""); };
    template = null;
    return function(objectArray) {
      var html = objectArray.map(m).join("");
      o = null;
      return html;
    };
  },
  evalIfOK: function(url) {
    if (url.substring(0, 11).toLowerCase() !== "javascript:") {
      return false;
    }
    setTimeout(function() {
      var script = document.createElementNS("http://www.w3.org/1999/xhtml", "script");
      script.type = "text/javascript";
      script.textContent = Utils.decodeURL(url).substring(11).trim();
      document.documentElement.appendChild(script).remove();
    }, 0);
    return true;
  },
  execCommand: function(parent, command, args) {
    var keys = command.split('.'), i, len;
    for (i = 0, len = keys.length - 1; i < len; i++) {
      parent = parent[keys[i]];
    }
    return parent[keys[i]](args[0], Object.setPrototypeOf(args[1] || {}, null), args[2]);
  },
  decodeURL: function(url, decode) {
    try {
      url = (decode || decodeURI)(url);
    } catch (e) {}
    return url;
  },
  Prevent: function(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, VHandler = {
  stack: [],
  push: function(func, env) {
    this.stack.push([func, env]);
  },
  bubbleEvent: function(event) {
    var ref = this.stack, i = ref.length, item, result;
    while (0 <= --i) {
      item = ref[i];
      result = item[0].call(item[1], event);
      if (result !== 0) {
        return result;
      }
    }
    return 0;
  },
  remove: function(env) {
    var ref = this.stack, i = ref.length;
    while (0 <= --i) {
      if (ref[i][1] === env) {
        ref.splice(i, 1);
        break;
      }
    }
  }
};

if (!String.prototype.startsWith) {
String.prototype.startsWith = function(s) {
  return this.length >= s.length && this.lastIndexOf(s, 0) === 0;
};
String.prototype.endsWith || (String.prototype.endsWith = function(s) {
  var i = this.length - s.length;
  return i >= 0 && this.indexOf(s, i) === i;
});
}
