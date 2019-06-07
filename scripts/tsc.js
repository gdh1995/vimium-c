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

var real_proc_exit = process.exit;
process.exit = function(){};
var real_args = argv.length > 2 ? argv.splice(2, argv.length - 2) : [];

argv.length = 2;
argv.push(fakeArg);
var ts = require("typescript/lib/tsc");
argv.length = 2;

var real_write = ts.sys.writeFile;
ts.sys.writeFile = function(path, data, writeBom) {
  if (lib.readFile(path, {}) === data) {
    let src = path.slice(-3) === ".js" ? path.slice(0, -3) + ".ts" : path;
    lib.touchFileIfNeeded(path, src);
  } else {
    return real_write(path, data, writeBom);
  }
};

process.exit = real_proc_exit;
ts.executeCommandLine(real_args);
