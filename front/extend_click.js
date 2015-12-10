"use strict";
(function(func) {
  var script, installer, onclick, container;
  script = document.createElement("script");
  if (script.style === null) { return; }
  window.addEventListener("VimiumRegistrationElementEvent", installer = function(event) {
    window.removeEventListener("VimiumRegistrationElementEvent", installer, true);
    container = event.target;
    container.addEventListener("VimiumRegistrationElementEvent-onclick", onclick, true);
    installer = null;
  }, true);
  window.addEventListener("VimiumRegistrationElementEvent-onclick", onclick = function(event) {
    event.target.hasOnclick = true;
    event.stopPropagation();
  }, true);
  Settings.onDestroy.registerClick = function() {
    window.removeEventListener("VimiumRegistrationElementEvent", installer, true);
    window.removeEventListener("VimiumRegistrationElementEvent-onclick", onclick, true);
    container && container.removeEventListener("VimiumRegistrationElementEvent-onclick", onclick, true);
  };
  script.type = "text/javascript";
  script.textContent = "(" + func.toString() + ")();";
  container = document.head || document.documentElement;
  container.insertBefore(script, container.firstElementChild);
  script.remove();
})(function() {
"use strict";
var _listen, container, handler, reg, register, toRegister;

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
  container = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
  document.documentElement.appendChild(container);
  container.dispatchEvent(new CustomEvent("VimiumRegistrationElementEvent"));
  container.remove();
  register = reg;
  for (var i = toRegister.length; 0 <= --i; ) { register(toRegister[i]); }
  handler = toRegister = reg = null;
};
_listen.call(window, "DOMContentLoaded", handler, true);

reg = setTimeout.bind(window, function(element) {
  var e1, e2, registrationEvent, wrapIncontainer;
  registrationEvent = new CustomEvent("VimiumRegistrationElementEvent-onclick");
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
