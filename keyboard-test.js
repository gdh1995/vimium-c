"use strict";
//@ts-check
// <!-- saved from url=(0028)https://smblott.org/keyboard.js on 2019/08/08 -->
// modified by gdh1995
(function() {
  var count = 0, n = 30, ref = "keydown keypress keyup".trim().split(/\s+/);

  var docEl = document.documentElement;
  var table = document.getElementById("keyTable").querySelector("tbody");
  var templateContent = document.querySelector("#rowTemplate").content;
  var preventAllCheckbox = document.querySelector("#preventAll");

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
        element.querySelector(".codeColumn").textContent = wrapValue(event.code);
        var key = wrapValue(event.key);
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
        modifiers = modifiers.join("-");
        if (event.getModifierState) {
          event.getModifierState("CapsLock") && (modifiers += " CapsLock=On")
          event.getModifierState("AltGraph") && (modifiers += " AltGr=On")
        }
        element.querySelector(".modifierColumn").textContent = modifiers.trim()
        element.querySelector(".keyCodeColumn").textContent = wrapValue(event.keyCode);
        element.querySelector(".timestampColumn").textContent = (event.timeStamp / 1000 % 3600).toFixed(3)
            .replace(/\.\d+/, function(s) { return s.replace(/\.?0+$/, "") })
        if (table.rows.length > n) {
          table.firstElementChild.remove()
        }
        table.appendChild(element);
        if (preventAllCheckbox.checked) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
        while (table.rows.length > 5 && docEl.scrollHeight > docEl.clientHeight) {
          table.firstElementChild.remove()
        }
  }

  document.querySelector("#reset").onclick = function () {
    table.textContent = "";
    document.querySelector("#input").value = "";
    count = 0;
  }

  /** @type {(val: any) => string} */
  function wrapValue(val) {
    return val ? val + "" : val === "" ? "(empty)" : "(" + val + ")"
  }
}).call(this);
