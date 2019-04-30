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
var cwd = argv[argi];
argv.length = argi;
if (cwd && fs.existsSync(cwd) && fs.statSync(cwd).isDirectory()) {
  process.chdir(cwd);
  cwd = null;
} else if (cwd) {
  console.error("No such command or directory:", cwd);
  return;
}
if (!fs.existsSync("tsconfig.json")) {
  var parent = __dirname.replace(/[\\\/][^\\\/]+[\\\/]?$/, "");
  if (fs.existsSync(parent + "/tsconfig.json")) {
    process.chdir(parent);
  }
}
require("typescript/lib/tsc");
