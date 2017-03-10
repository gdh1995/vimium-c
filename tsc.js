#!/usr/bin/env node
var fs = require('fs');
var argv = process.argv, argi = 0;
if (/\bnode\b/i.test(argv[argi])) {
  argi++;
}
if (/\btsc\.\b/i.test(argv[argi])) {
  argi++;
}
var cwd = popProcessArg(argi) || ".";
if (fs.existsSync(cwd)) {
  process.chdir(cwd);
  cwd = process.cwd();
}

if (!fs.existsSync("package.json")) {
  process.chdir("..");
}
if (cwd) {
  process.chdir(cwd);
}

tsc = require("typescript/lib/tsc");


function popProcessArg(index, defaultValue) {
  var arg = process.argv[index] || null;
  if (arg != null) {
    process.argv.splice(index, 1);
  } else if (defaultValue != null) {
    arg = defaultValue;
  }
  return arg;
}
