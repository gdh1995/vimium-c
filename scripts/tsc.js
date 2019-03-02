#!/usr/bin/env node
"use strict";
var fs = require('fs');
var argv = process.argv, argi = 0;
if (/\bnode\b/i.test(argv[argi])) {
  argi++;
}
if (/\btsc(\.\b|$)/i.test(argv[argi])) {
  argi++;
}
var cwd = popProcessArg(argi);
cwd === "." && (cwd = null);

if (cwd && !fs.existsSync("package.json")) {
  process.chdir(__dirname);
}
(function() {
  if (cwd && fs.existsSync(cwd) && fs.statSync(cwd).isDirectory()) {
    process.chdir(cwd);
    cwd = null;
  } else if (cwd) {
    console.error("No such command or directory:", cwd);
    return;
  }
  require("typescript/lib/tsc");
})();

function popProcessArg(index, defaultValue) {
  var arg = process.argv[index] || null;
  if (arg != null) {
    process.argv.splice(index, 1);
  } else if (defaultValue != null) {
    arg = defaultValue;
  }
  return arg;
}
