"use strict";
if (!String.prototype.startsWith) {
String.prototype.startsWith = function startsWith(str) {
  var pos = Number(arguments[1]) | 0;
  return this.toString().lastIndexOf(str.toString(), pos) === pos;
};
String.prototype.endsWith || (String.prototype.endsWith = function endsWith(str) {
  var _this = this.toString(), i = _this.length, pos = arguments[1], u;
  str = str.toString();
  i = Math.min(Math.max(0, pos === u ? i : (Number(pos) | 0)), i) - str.length;
  return i >= 0 && _this.indexOf(str, i) === i;
});
}
