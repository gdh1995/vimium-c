// <!-- saved from url=(0028)https://smblott.org/keyboard.js on 2019/08/08 -->
// modified by gdh1995
(function() {
  var count, n, ref;

  n = 30;

  count = 0;

  var table = document.getElementById("keyTable").querySelector("tbody");
  var templateContent = document.querySelector("#rowTemplate").content;
  var preventAllCheckbox = document.querySelector("#preventAll");

  ref = "keydown keypress keyup".trim().split(/\s+/);
  for (var i = 0, len = ref.length; i < len; i++) {
    window.addEventListener(ref[i], onKeyboard, true)
  }
  /** @param {KeyboardEvent} event */
  function onKeyboard(event) {
        var element = document.importNode(templateContent, true);
        var type, modifiers;
        element.querySelector(".eventNumber").textContent = ++count;
        type = event.type;
        if (event.repeat) {
          type += ".repeat";
        }
        element.querySelector(".eventColumn").textContent = type;
        element.querySelector(".codeColumn").textContent = event.code;
        let key = event.key;
        key = key ? key : key === "" ? "(empty)" : "(" + key + ")";
        if (key.trim() !== key) {
          key = "(" + key.replace(/\s/g, function(s) {
            return "\\u" + (s.charCodeAt() + 0x10000).toString(16).slice(1)
          }) + ")";
        }
        element.querySelector(".keyColumn").textContent = key
        modifiers = [];
        if (event.ctrlKey) {
          modifiers.push("Control");
        }
        if (event.altKey) {
          modifiers.push("Alt");
        }
        if (event.metaKey) {
          modifiers.push("Meta");
        }
        if (event.shiftKey) {
          modifiers.push("Shift");
        }
        if (event.getModifierState) {
          event.getModifierState("CapsLock") && modifiers.push("CapsLock=On")
          event.getModifierState("AltGraph") && modifiers.push("AltGr=On")
        }
        element.querySelector(".modifierColumn").textContent = modifiers.join("-");
        element.querySelector(".keyCodeColumn").textContent = event.keyCode;
        if (n < table.rows.length) {
          table.firstElementChild.remove()
        }
        table.appendChild(element);
        if (preventAllCheckbox.checked) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
  }

  document.querySelector("#reset").onclick = function () {
    table.textContent = "";
    document.querySelector("#input").value = "";
    count = 0;
  }
}).call(this);
