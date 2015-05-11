"use strict";
var handlerStack = {
  _counter: 1,
  current: null,
  stacks: {keydown: [], keypress: [], keyup: [], DOMActivate: []},
  table: [],
  events: ["keydown", "keypress", "keyup", "DOMActivate"],
  init: function() {
    var stacks, events, _i;
    for (stacks = this.stacks, events = this.events, _i = events.length; 0 <= --_i; ) {
      stacks[events[_i]] = [];
    };
  },
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
    var handler, _ref = this.stacks[type], _i = _ref.length, result;
    while (0 <= (_i -= 2)) {
      handler = _ref[_i];
      this.current = _ref[_i + 1];
      result = handler.call(this.current[0], event);
      if (! result) {
        DomUtils.suppressEvent(event);
        this.current = null;
        return false;
      }
    }
    this.current = null;
    return true;
  },
  remove: function(id) {
    var line, stack, table, events, _i, _last;
    if (this.current) {
      if (id == null) { id = this.current[1]; } /*
      else if (id !== this.current[1]) {
        console.warn("%cvim: %cwarn: %cremove handlers:", "color:blue", "color:black", "color:red;" //
          , id, "/", this.current[2]);
        console.trace(this.current);
      } //*/
    } else if (!(id > 0)) {
      return 0;
    }
    for (table = this.table, _i = table.length; 0 <= --_i; ) {
      line = table[_i];
      if (line[1] === id) { break; }
    }
    if (_i < 0) { return -1; }
    table.splice(_i, 1);
    for (events = this.events, _last = events.length; 2 <= --_last; ) {
      if (line[_last] === undefined) { continue; }
      stack = this.stacks[events[_last - 2]];
      _i = stack.lastIndexOf(line);
      if (_i > 0) { stack.splice(_i - 1, 2); }
    }
    return id;
  },
};
