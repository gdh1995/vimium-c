#!/usr/bin/env node
"use strict";
var opts = {
  "mangle": {
    "properties": true,
    "toplevel": true
  },
  nameCache: { vars: {}, props: {} }
};

var terser = require('terser');
var hasOptionUndeclared = require('terser/package').version >= '4.1.1';
if (hasOptionUndeclared) {
  opts.mangle.properties = {
    "undeclared": true
  };
}
terser.minify('var Bar = {};', opts);
var result = terser.minify('var Foo = { foo: function() { return Bar.bar() } };', opts);
var expected = `var r={o:function(){return a.${hasOptionUndeclared ? "t" : "v"}()}};`;
console.log("[task] test uglifying external properties",
    "\n[Current ]", result.code, "\n[Expected]", expected);
if (result.code === expected) {
  console.log(">>> same");
} else {
  // https://github.com/terser-js/terser/issues/397
  console.log(">>> different, so", hasOptionUndeclared ? "please check test code" : "recommend a terser <= v3.14.0");
}
