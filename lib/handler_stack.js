"use strict";
var handlerStack = {
  stack: [],
  push: function(func, env) {
    this.stack.push([func, env]);
  },
  set: function(func, env) {
    this.remove(env); this.push(func, env);
  },
  bubbleEvent: function(event) {
    var ref = this.stack, i = ref.length, item, result;
    while (0 <= --i) {
      item = ref[i];
      result = item[0].call(item[1], event);
      if (result !== 0) {
        return result;
      }
    }
    return 0;
  },
  remove: function(env) {
    var ref = this.stack, i = ref.length;
    while (0 <= --i) {
      if (ref[i][1] === env) {
        ref.splice(i, 1);
        break;
      }
    }
  }
};
