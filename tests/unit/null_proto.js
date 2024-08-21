"use strict";

var t;
var arr = [
  Object.create(null),
  {__proto__: null},
  (t={}, t.__proto__ = null, t),
  (t={}, t["__proto__"] = null, t),
  {__proto__: null, ["__proto__"]: null}
];
try {
  arr.push(eval('({... {__proto__:null, ["__proto__"]:null}})'))
} catch (_e) {}

arr.forEach(function (i, ind) { console.log("[" + ind + "]", i, i.hasOwnProperty || "(null-ed)")});

arr.forEach(function (i, ind) {
  i.__proto__ = { a: 1 };
  console.log("[" + ind + "]", i, i.a || "(still null-ed)", i.__proto__ || "(unknown error)");
});

arr.forEach(function (i, ind) {
  i["__proto__"] = { a: 1 };
  console.log("[" + ind + "]", i, i.a || "(still null-ed)", i.__proto__ || "(unknown error)");
});
