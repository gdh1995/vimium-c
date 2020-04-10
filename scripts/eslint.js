#!/usr/bin/env node

var node = process.argv[0],
args = "eslint/bin/eslint --ext .ts".split(" ");
if (process.argv.length > 2) {
  args = args.concat(process.argv.slice(2));
} else {
  args.push(".");
}
process.argv = [node, ...args];
require(process.argv[1]);
