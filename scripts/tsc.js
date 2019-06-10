#!/usr/bin/env node
"use strict";
var fs = require('fs');
var lib = require("./dependencies");

var argv = process.argv, argi = 0;
if (/\bnode\b/i.test(argv[argi])) {
  argi++;
}
if (/\btsc(\.\b|$)/i.test(argv[argi])) {
  argi++;
}
var cwd = argv[argi];
if (cwd && fs.existsSync(cwd) && fs.statSync(cwd).isDirectory()) {
  process.chdir(cwd);
  cwd = null;
  argv.length = argi;
} else if (cwd && cwd[0] !== "-") {
  console.error("No such command or directory:", cwd);
  return;
}
if (!fs.existsSync("tsconfig.json")) {
  var parent = __dirname.replace(/[\\\/][^\\\/]+[\\\/]?$/, "");
  if (fs.existsSync(parent + "/tsconfig.json")) {
    process.chdir(parent);
  }
}

var _tscPatched = false;
var fakeArg = "--vimium-c-fake-arg";

function patchTSC() {
  if (_tscPatched) { return; }
  var path = "node_modules/typescript/lib/tsc.js";
  for (var i = 0; i < 3 && !fs.existsSync(path); ) {
    path = "../" + path;
  }
  if (i >= 3) { return; }
  var info = {};
  try {
    var code = lib.readFile(path, info).trim();
    var patched = "\n;\n\nmodule.exports = ts;\n"
          + "ts.sys.args[0] !== '" + fakeArg + "' && ts.executeCommandLine(ts.sys.args);\n";
    if (code.slice(-patched.length) !== patched && code.indexOf("module.exports = ") < 0) {
      var oldTail = "ts.executeCommandLine(ts.sys.args);";
      if (code.slice(-oldTail.length) === oldTail) {
        code = code.slice(0, -oldTail.length);
      }
      code = code + patched;;
      fs.writeFileSync(path, code);
      print("Patch TypeScript/lib/tsc.js: succeed");
    }
    _tscPatched = true;
  } catch (e) {
    console.error("Error: Failed to patch TypeScript/lib/tsc.js: " + e);
  }
}

patchTSC();
if (!_tscPatched) {
  require("typescript/lib/tsc");
  return;
}

// ==================== customized building ====================

var doesUglifyLocalFiles = process.env.UGLIFY_LOCAL !== "0";
var LIB_UGLIFY_JS = 'terser';

var real_proc_exit = process.exit;
process.exit = function(){};
var real_args = argv.length > 2 ? argv.splice(2, argv.length - 2) : [];

argv.length = 2;
argv.push(fakeArg);
var ts = require("typescript/lib/tsc");
argv.length = 2;

var real_write = ts.sys.writeFile;
var cache = Object.create(null);

ts.sys.writeFile = function(path, data, writeBom) {
  var isJS = path.slice(-3) === ".js";
  var srcPath = isJS ? path.slice(0, -3) + ".ts" : path;
  if (cache[path] === data) {
    if (fs.existsSync(targetPath)) {
      lib.touchFileIfNeeded(path, srcPath);
    } else {
      fs.closeSync(fs.openSync(targetPath, "w"));
    }
    return;
  }
  cache[path] === data;
  if (doesUglifyLocalFiles && isJS) {
    data = getUglifyJS()(data);
  }
  if (fs.existsSync(path) && lib.readFile(path, {}) === data) {
    lib.touchFileIfNeeded(path, srcPath);
  } else {
    return real_write(path, data, writeBom);
  }
};

var defaultUglifyConfig = null;
var getUglifyJS = function() {
  var uglify;
  try {
    uglify = require(LIB_UGLIFY_JS);
  } catch (e) {}
  var minify;
  if (uglify == null) {
    console.log("Can not load " + LIB_UGLIFY_JS + ", so skip uglifying");
    minify = function(data) { return data; };
  } else {
    minify = function(data, config) {
      config || (config = getDefaultUglifyConfig());
      data = uglify.minify(data, config || defaultUglifyConfig).code;
      return data;
    };
  }
  getUglifyJS = function() { return minify; };
  return minify;
};

function getDefaultUglifyConfig() {
  if (!defaultUglifyConfig) {
    defaultUglifyConfig = lib.loadUglifyConfig("scripts/uglifyjs.local.json");
  }
  return defaultUglifyConfig;
}

process.exit = real_proc_exit;
ts.executeCommandLine(real_args);
