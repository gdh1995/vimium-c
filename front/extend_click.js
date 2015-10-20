"use strict";
(function(func) {
  var script, parent, installer, onclick, container;
  window.addEventListener("VimiumRegistrationElementEvent", installer = function (event) {
    window.removeEventListener("VimiumRegistrationElementEvent", installer, true);
    container = event.target;
    container.addEventListener("VimiumRegistrationElementEvent-click", onclick, true);
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
  script = document.createElementNS("http://www.w3.org/1999/xhtml", "script");
  script.type = "text/javascript";
  script.id = "vimium-plus-extend-click";
  script.textContent = "(" + func.toString() + ")()";
  parent = document.head || document.documentElement;
  parent.insertBefore(script, parent.firstElementChild);
  setTimeout(function() { script.remove(); }, 16);
})(function() {
"use strict";
var _listen, toRegister, handler, register, container;

_listen = Element.prototype.addEventListener;
toRegister = [];
container = null;

handler = function(type) {
  if (type === "click" && this instanceof Element) {
    setTimeout(register, 0, this);
  }
  return _listen.apply(this, arguments);
};
EventTarget.prototype.addEventListener = handler;

handler = function() {
  container = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
  document.documentElement.appendChild(container);
  container.dispatchEvent(new CustomEvent("VimiumRegistrationElementEvent"));
  document.documentElement.removeChild(container);
  register = function(element) {
    var e1, e2, registrationEvent, wrapIncontainer;
    wrapIncontainer = !document.contains(element);
    if (wrapIncontainer) {
      for (e1 = element; (e2 = e1.parentElement) != null; e1 = e2) {}
      if (e1.parentNode instanceof ShadowRoot) { return; }
      container.appendChild(e1);
    }
    registrationEvent = new CustomEvent("VimiumRegistrationElementEvent-onclick");
    element.dispatchEvent(registrationEvent);
    if (wrapIncontainer) {
      container.removeChild(e1);
    }
  };
  toRegister.map(function(element) { setTimeout(register, 0, element); });
  window.removeEventListener("DOMContentLoaded", handler, true);
  handler = toRegister = null;
};
_listen.call(window, "DOMContentLoaded", handler, true);
register = function(element) {
  toRegister.push(element);
};
});
