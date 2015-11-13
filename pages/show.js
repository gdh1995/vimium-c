"use strict";
var $ = document.getElementById.bind(document), shownNode;
function decodeHash() {
  var url, type;
  url = location.hash;
  if (url.lastIndexOf("#!image=", 0) === 0) {
    url = url.substring(8);
    type = "image";
  } else {
    return;
  }
  try {
    url = decodeURIComponent(url);
  } catch (e) {}

  switch (type) {
  case "image":
    shownNode = $("shownImage");
    shownNode.src = url;
    shownNode.onclick = function() {
      clickLink(this.src, {
        target: "_blank"
      });
    };
    break;
  }

  if (shownNode) {
    shownNode.style.display = "";
  }
}

window.addEventListener("hashchange", decodeHash);
decodeHash();

window.addEventListener("keydown", function(event) {
  var str;
  if (!event.ctrlKey || event.shiftKey || !shownNode) { return; }
  str = String.fromCharCode(event.keyCode);
  if (str === 'S') {
    if (str = shownNode.src) {
      event.preventDefault();
      clickLink(str, {
        download: ""
      });
    }
  }
});

function clickLink(url, options) {
  var a = document.createElement('a'), i;
  for (i in options) {
    a.setAttribute(i, options[i]);
  }
  a.href = url;
  a.click();
}
