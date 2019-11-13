"use strict";

var fs = require("fs");
var osPath = require('path');

function readFile(fileName, info) {
  info == null && (info = {});
  var buffer = fs.readFileSync(fileName);
  var len = buffer.length;
  if (len >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
      // Big endian UTF-16 byte order mark detected. Since big endian is not supported by node.js,
      // flip all byte pairs and treat as little endian.
      len &= ~1;
      for (var i = 0; i < len; i += 2) {
          var temp = buffer[i];
          buffer[i] = buffer[i + 1];
          buffer[i + 1] = temp;
      }
      info.bom = "\uFFFE";
      return buffer.toString("utf16le", 2);
  }
  if (len >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
      // Little endian UTF-16 byte order mark detected
      info.bom = "\uFEFF";
      return buffer.toString("utf16le", 2);
  }
  if (len >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      // UTF-8 byte order mark detected
      info.bom = "\uFEFF";
      return buffer.toString("utf8", 3);
  }
  info.bom = "";
  // Default is UTF-8 with no byte order mark
  return buffer.toString("utf8");
}

var _readJSON;

function readJSON(fileName, throwError) {
  if (!_readJSON) {
    _makeJSONReader();
  }
  return _readJSON(fileName, throwError);
}

function _makeJSONReader() {
  var stringOrComment = /"(?:\\[\\\"]|[^"])*"|'(?:\\[\\\']|[^'])*'|\/\/[^\r\n]*|\/\*[^]*?\*\//g
    , notLF = /[^\r\n]+/g, notWhiteSpace = /\S/;
  function spaceN(str) {
    return ' '.repeat(str.length);
  }
  function onReplace(str) {
    switch (str[0]) {
    case '/': case '#':
      if (str[0] === "/*") {
        // replace comments with whitespace to preserve original character positions
        return str.replace(notLF, spaceN);
      }
      return spaceN(str);
    case '"': case "'": // falls through
    default:
      return str;
    }
  }
  function readJSON1(fileName, throwError) {
    var text = readFile(fileName);
    text = text.replace(stringOrComment, onReplace);
    try {
      return notWhiteSpace.test(text) ? JSON.parse(text) : {};
    } catch (e) {
      if (throwError === true) {
        throw e;
      }
      var err = "Failed to parse file '" + fileName + "': " + e + ".";
      console.warn("%s", err);
      return {};
    }
  }
  _readJSON = readJSON1;
}

var _uglifyjsConfig = null;
function loadUglifyConfig(path, reload) {
  var a = _uglifyjsConfig;
  if (a == null || reload) {
    a = readJSON(path);
    if (!reload) {
      _uglifyjsConfig = a;
    }
    var o = a.output || (a.output = {});
    var c = a.compress || (a.compress = {}); // gd = c.global_defs || (c.global_defs = {});
    function ToRegExp(literal) {
      var re = literal.match(/^\/(.*)\/([a-z]*)$/);
      return re ? new RegExp(re[1], re[2]) : literal;
    }
    if (typeof c.keep_fnames === "string") {
      c.keep_fnames = ToRegExp(c.keep_fnames);
    }
    var m = a.mangle, p = m && m.properties;
    if (p && typeof p.regex === "string") {
      p.regex = ToRegExp(p.regex);
    }
    if (m && typeof m.keep_fnames === "string") {
      m.keep_fnames = ToRegExp(m.keep_fnames);
    }
    else if (m && !m.keep_fnames) {
      m.keep_fnames = c.keep_fnames;
    }
    var comments = o.comments;
    if (comments && typeof comments === "string") {
      o.comments = ToRegExp(comments);
    }
    let ver = "", terser = null;
    try {
      ver = require('terser/package').version;
    } catch (e) {
      console.log("Can not read the version of terser.");
    }
    try {
      terser = require('terser');
    } catch (e) {
      console.log("Can not read the module of terser.");
    }
    if (ver) {
      var hasOptionUndeclared = ver >= '4.1.2', has_wrap_func_args = ver >= '4.3';
      if (m) {
        if (hasOptionUndeclared) {
          if (p.undeclared == null) {
            p.undeclared = true;
          }
        } else {
          delete p.undeclared;
        }
      }
      if (!has_wrap_func_args && a.output && a.output.wrap_func_args !== undefined) {
        delete a.output.wrap_func_args;
      }
    }
    if (terser && terser.default_options) {
      var allowed = terser.default_options();
      if (allowed) {
        var allowedKeys = new Set(Object.keys(allowed.compress)), skipped = [];
        for (var key1 in c) {
          if (!allowedKeys.has(key1)) {
            skipped.push(key1);
            delete c[key1];
          }
        }
        if (skipped.length > 0) {
          require("fancy-log")(`Skip these terser options: ${skipped.join(", ")}`);
        }
      }
    }
  }
  return a;
}

function touchFileIfNeeded(targetPath, /** Optional */ fileToCompareTime) {
  if (fileToCompareTime === targetPath) { fileToCompareTime = null; }
  if (!fs.existsSync(targetPath) || fileToCompareTime && !fs.existsSync(fileToCompareTime)) {
    return;
  }
  var fd = fs.openSync(targetPath, "a"), fd2 = null;
  try {
    var stat = fs.fstatSync(fd);
    if (stat.mtime != null && fileToCompareTime) {
      var srcMtime = fs.fstatSync(fd2 = fs.openSync(fileToCompareTime, "r")).mtime;
      if (srcMtime != null && srcMtime < stat.mtime) {
        return;
      }
    }
    fs.futimesSync(fd, parseInt(stat.atime.getTime() / 1000, 10), parseInt(Date.now() / 1000, 10));
  } finally {
    fs.closeSync(fd);
    if (fd2 != null) {
      fs.closeSync(fd2);
    }
  }
  return true;
}

function extendIf(b, a) {
  Object.setPrototypeOf(a, null);
  for (var i in a) {
    (i in b) || (b[i] = a[i]);
  }
  return b;
}

function getGitCommit() {
  try {
    var branch = readFile(".git/HEAD");
    branch = branch && branch.replace("ref:", "").trim();
    if (branch) {
      var commit = readFile(".git/" + branch);
      return commit ? commit.trim().slice(0, 7) : null;
    }
  } catch (e) {}
  return null;
}

module.exports = {
  readFile: readFile,
  readJSON: readJSON,
  loadUglifyConfig: loadUglifyConfig,
  touchFileIfNeeded: touchFileIfNeeded,
  extendIf: extendIf,
  getGitCommit: getGitCommit,
};
