"use strict";
var handlerStack = {
  counter: 1,
  stack: [],
  push: function(handler) {
    var id = ++this.counter, line;
    line = [handler.keydown, handler._this || null, id];
    this.stack.push(line);
    return id;
  },
  bubbleEvent: function(event) {
    var ref = this.stack, i = ref.length, item, result;
    while (0 <= --i) {
      item = ref[i];
      result = item[0].call(item[1], event);
      if (result === true) {
        continue;
      }
      if (! result) {
        event.preventDefault();
      }
      event.stopImmediatePropagation();
      return false;
    }
    return true;
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
  }
};
