"use strict";
var $ = document.getElementById.bind(document);
function decodeHash() {
  var shownNode, url, type;
  url = location.hash;
  if (url.lastIndexOf("#!image=", 0) === 0) {
    url = url.substring(8);
    type = "image";
  }
  if (url) {
    try {
      url = decodeURIComponent(url);
    } catch (e) {}
  } else {
    return;
  }

  switch (type) {
  case "image":
    shownNode = $("shownImage");
    shownNode.src = url;
    break;
  default: return;
  }

  if (shownNode) {
    shownNode.style.display = "";
  }
}

window.addEventListener("hashchange", decodeHash);
decodeHash();

window.addEventListener("keydown", function(event) {
  var str;
  if (!event.ctrlKey || event.shiftKey) { return; }
  str = String.fromCharCode(event.keyCode);
  if (str === 'S') {
    if (str = $("shownImage").src) {
      download(str);
      event.preventDefault();
    }
  }
});
function download(url) {
  var a = document.createElement('a');
  a.download = "";
  a.href = url;
  a.click();
}
