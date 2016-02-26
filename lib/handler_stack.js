"use strict";
var handlerStack = {
  _id: 1,
  stack: [],
  push: function(func, env) {
    this.stack.push([func, env, env._id = ++this._id]);
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
  remove: function(env, _id) {
    if ((_id = env._id) <= 0) { return; }
    this._id = 0;
    var ref = this.stack, i = ref.length;
    while (0 <= --i) {
      if (ref[i][2] === _id) {
        ref.splice(i, 1);
        break;
      }
    }
  }
};
