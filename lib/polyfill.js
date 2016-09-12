"use strict";
if (!String.prototype.startsWith) {
String.prototype.startsWith = function(str, pos) {
  pos = pos | 0;
  return this.lastIndexOf(str, pos) === pos;
};
String.prototype.endsWith || (String.prototype.endsWith = function(str, pos) {
  var i = this.length, j = +pos;
  i = Math.min(pos ? ((pos | 0) === j ? j : i) : pos === 0 ? 0 : i, i) - str.length;
  return i >= 0 && this.indexOf(str, i) === i;
});
}
