"use strict";
var fs = require('fs');
var argv = process.argv, argi = 0;
if (/\bnode\b/i.test(argv[argi])) {
  argi++;
}
if (/\btsc\.\b/i.test(argv[argi])) {
  argi++;
}
var cwd = popProcessArg(argi);

if (!fs.existsSync("package.json")) {
  process.chdir("..");
}
switch (cwd) {
default:
  if (cwd && fs.existsSync(cwd) && fs.statSync(cwd).isDirectory()) {
    process.chdir(cwd);
    cwd = null;
  }
  tsc = require("typescript/lib/tsc");
  break;
}

function popProcessArg(index, defaultValue) {
  var arg = process.argv[index] || null;
  if (arg != null) {
    process.argv.splice(index, 1);
  } else if (defaultValue != null) {
    arg = defaultValue;
  }
  return arg;
}
