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
switch (cwd) {
case "all": case "local":
  var child_process = require('child_process');
  var cmd = argv[0];
  var tasks = ["background", "content", "pages", "front"];
  argv = argv.slice(1);
  argv.push("");
  var options = {
    stdio: ["ignore", process.stdout, process.stderr]
  };
  for (var i = 0; i < tasks.length; i++) {
    var name = tasks[i];
    argv[argv.length - 1] = tasks[i];
    child_process.spawn(cmd, argv.slice(0, name ? undefined : argv.length - 1), options);
  }
  break;
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
