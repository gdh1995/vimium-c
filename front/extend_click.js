"use strict";
(function(func) {
  var script = document.createElement("script"), installer, onclick, container;
  if (!script.style) { return; }
  window.addEventListener("VimiumReg", installer = function(event) {
    window.removeEventListener("VimiumReg", installer, true);
    container = event.target;
    container.addEventListener("VimiumOnclick", onclick, true);
    installer = null;
  }, true);
  window.addEventListener("VimiumOnclick", onclick = function(event) {
    event.target.vimiumHasOnclick = true;
    event.stopPropagation();
  }, true);
  Settings.onDestroy.registerClick = function() {
    window.removeEventListener("VimiumReg", installer, true);
    window.removeEventListener("VimiumOnclick", onclick, true);
    container && container.removeEventListener("VimiumOnclick", onclick, true);
  };
  script.type = "text/javascript";
  script.textContent = "(" + func.toString() + ")();";
  document.documentElement.insertBefore(script, document.documentElement.firstElementChild);
  script.remove();
})(function() {
"use strict";
var _listen, container, handler, reg, register, toRegister, timeout;

_listen = EventTarget.prototype.addEventListener;
toRegister = [];
register = toRegister.push.bind(toRegister);
EventTarget.prototype.addEventListener = function(type, listener, useCapture) {
  if (type === "click" && this instanceof Element) {
    register(this);
  }
  return _listen.call(this, type, listener, useCapture);
};

handler = function() {
  window.removeEventListener("DOMContentLoaded", handler, true);
  clearTimeout(timeout);
  container = document.createElement("div");
  document.documentElement.appendChild(container);
  container.dispatchEvent(new CustomEvent("VimiumReg"));
  container.remove();
  register = reg;
  for (var i = toRegister.length; 0 <= --i; ) { register(toRegister[i]); }
  handler = toRegister = reg = null;
};
_listen.call(window, "DOMContentLoaded", handler, true);
timeout = setTimeout(handler, 1000);

reg = setTimeout.bind(null, function(element) {
  var e1, e2, registrationEvent, wrapIncontainer;
  registrationEvent = new CustomEvent("VimiumOnclick");
  if (document.contains(element)) {
    element.dispatchEvent(registrationEvent);
    return;
  }
  for (e1 = element; (e2 = e1.parentElement) != null; e1 = e2) {}
  if (e1.parentNode != null) { return; }
  // NOTE: ignore nodes belonging to a shadowRoot
  container.appendChild(e1);
  element.dispatchEvent(registrationEvent);
  e1.remove();
}, 0);
});
