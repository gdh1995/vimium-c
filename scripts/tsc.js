#!/usr/bin/env node
// @ts-check
"use strict";
/** @type {import("./dependencies").FileSystem} */
// @ts-ignore
var fs = require("fs");
/** @type {import("./dependencies").ProcessType} */
// @ts-ignore
var process = require("process");
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
  // @ts-ignore
  return;
}
if (!fs.existsSync("tsconfig.json")) {
  // @ts-ignore
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
          + "ts.sys.args[0] !== '" + fakeArg + "' &&\n";
    if (code.slice(-4096).indexOf(patched) < 0 && code.indexOf("module.exports = ") < 0) {
      var oldTail = "ts.executeCommandLine(ts.sys";
      var pos = code.lastIndexOf(oldTail);
      if (pos < 0) {
        throw Error("The target call is not found:");
      }
      code = code.slice(0, pos) + patched + code.slice(pos);
      fs.writeFileSync(path, code);
      console.log("Patch TypeScript/lib/tsc.js: succeed");
    }
    _tscPatched = true;
  } catch (e) {
    console.error("Error: Failed to patch TypeScript/lib/tsc.js: " + e);
  }
}

patchTSC();
if (!_tscPatched) {
  // @ts-ignore
  require("typescript/lib/tsc");
  // @ts-ignore
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
// @ts-ignore
var ts = require("typescript/lib/tsc");
argv.length = 2;

var real_write = ts.sys.writeFile;
var cache = Object.create(null);

ts.sys.writeFile = function(path, data, writeBom) {
  var isJS = path.slice(-3) === ".js";
  var srcPath = isJS ? path.slice(0, -3) + ".ts" : path;
  if (cache[path] === data) {
    if (fs.existsSync(path)) {
      console.log("\tTOUCH:", path);
      lib.touchFileIfNeeded(path, srcPath);
    } else {
      fs.closeSync(fs.openSync(path, "w"));
    }
    return;
  }
  cache[path] === data;
  if (doesUglifyLocalFiles && isJS) {
    data = getUglifyJS()(data);
  }
  if (fs.existsSync(path) && lib.readFile(path, {}) === data) {
    console.log("\tTOUCH:", path);
    lib.touchFileIfNeeded(path, srcPath);
  } else {
    return real_write(path, data, writeBom);
  }
};

/** @type {import("./dependencies").TerserOptions | null} */
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
      data = uglify.minify(data, config).code;
      var old_mangle = config.mangle;
      config.mangle = false;
      data = uglify.minify(data, config).code;
      config.mangle = old_mangle != null ? old_mangle : null;
      return data;
    };
  }
  getUglifyJS = function() { return minify; };
  return minify;
};

function getDefaultUglifyConfig() {
  if (!defaultUglifyConfig) {
    defaultUglifyConfig = lib.loadUglifyConfig("scripts/uglifyjs.local.json");
    var compress = defaultUglifyConfig.compress || (defaultUglifyConfig.compress = {});
    compress.passes = 1;
  }
  return defaultUglifyConfig;
}

var iconsDone = null, tsDone = null;

process.exit = function (exit_code) {
  tsDone = exit_code;
  if (iconsDone != null) { real_proc_exit(tsDone || iconsDone); }
};

try {
  require("./icons-to-blob").main(function (err) {
    iconsDone = err ? 1 : 0;
    if (tsDone != null) { real_proc_exit(tsDone || iconsDone); }
  });
} catch (ex) {
  console.log("Failed to convert icons to binary data:", ex);
}
ts.executeCommandLine(ts.sys, {
    onCompilerHostCreate: ts.noop,
    onCompilationComplete: ts.noop,
    onSolutionBuilderHostCreate: ts.noop,
    onSolutionBuildComplete: ts.noop
}, real_args);
