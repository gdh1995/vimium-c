"use strict";
var handlerStack = {
  counter: 1,
  stack: [],
  push: function(func, env) {
    var id = ++this.counter;
    this.stack.push([func, env || null, id]);
    return id;
  },
  bubbleEvent: function(event) {
    var ref = this.stack, i = ref.length, item, result;
    while (0 <= --i) {
      item = ref[i];
      result = item[0].call(item[1], event);
      if (result === 0) {
        continue;
      }
      if (result === 2) {
        event.preventDefault();
      }
      event.stopImmediatePropagation();
      return true;
    }
    return false;
  },
  remove: function(id) {
    if (!(id > 0)) { return 0; }
    var ref = this.stack, i = ref.length;
    while (0 <= --i) {
      if (ref[i][2] === id) {
        ref.splice(i, 1);
        break;
      }
    }
    return id;
  },
  SuppressMost: function(event) {
    var n = event.keyCode;
    return (n > KeyCodes.f1 && n <= KeyCodes.f12) ? 1 : 2;
  }
};
