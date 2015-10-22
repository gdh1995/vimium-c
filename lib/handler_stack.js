"use strict";
var handlerStack = {
  _counter: 1,
  stacks: {__proto__: null, keydown: [], keypress: []},
  table: [],
  events: ["keydown", "keypress"],
  push: function(handler) {
    var stacks = this.stacks, events = this.events, _i = events.length, line, key, func, id;
    id = ++this._counter;
    line = new Array(_i + 2);
    line[0] = handler._this || null;
    line[1] = id;
    while (0 <= --_i) {
      key = events[_i];
      if (func = handler[key]) {
        stacks[key].push(func, line);
        line[_i + 2] = func;
      }
    }
    this.table.push(line);
    return id;
  },
  bubbleEvent: function(type, event) {
    var _ref = this.stacks[type], _i = _ref.length, result;
    while (0 <= (_i -= 2)) {
      result = _ref[_i].call(_ref[_i + 1][0], event);
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
    var line, stack, table, events, _i, _last;
    if (!(id > 0)) { return 0; }
    for (table = this.table, _i = table.length; 0 <= --_i; ) {
      line = table[_i];
      if (line[1] === id) { break; }
    }
    if (_i < 0) { return -1; }
    table.splice(_i, 1);
    for (events = this.events, _last = events.length + 2; 2 <= --_last; ) {
      if (line[_last] === undefined) { continue; }
      stack = this.stacks[events[_last - 2]];
      _i = stack.lastIndexOf(line);
      if (_i > 0) { stack.splice(_i - 1, 2); }
    }
    return id;
  }
};
